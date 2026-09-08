import { Server } from 'socket.io';

export const setupSockets = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: '*', // Adjust in production
      methods: ['GET', 'POST']
    }
  });

  // Live Kahoot Rooms
  const liveRooms = new Map();

  // Duel Rooms
  const duelRooms = new Map();

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    // Teacher creates a room
    socket.on('host_room', ({ testId }) => {
      // Generate 6-digit pin
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      liveRooms.set(pin, {
        pin,
        hostId: socket.id,
        testId,
        status: 'waiting', // waiting | active | finished
        currentQuestion: -1,
        players: [],
        scores: {}
      });
      socket.join(pin);
      socket.emit('room_created', { pin });
    });

    // Student joins a room
    socket.on('join_room', ({ pin, name }) => {
      const room = liveRooms.get(pin);

      // 1. Xona mavjudligini tekshir
      if (!room) {
        return socket.emit('error', 'Xona topilmadi. PIN kodni tekshiring.');
      }

      // 2. Bir xil socket.id bilan ikki marta join qilishni bloklash (double-click)
      const alreadyById = room.players.find(p => p.id === socket.id);
      if (alreadyById) {
        // Allaqachon ulanilgan — shunchaki 'joined' qayta yubor (idempotent)
        return socket.emit('joined', { pin, name: alreadyById.name, testId: room.testId });
      }

      // 3. Reconnect: bir xil ism bilan qayta ulanish (yangi socket.id, lekin avvalgi o'quvchi)
      //    Tarmoq muammosi yoki sahifa refresh bo'lganda socket.id o'zgaradi.
      //    Agar bir xil ism bo'lsa — eski yozuvni yangi socket.id bilan yangilaymiz.
      const existingByName = room.players.find(
        p => p.name.trim().toLowerCase() === (name || '').trim().toLowerCase()
      );
      if (existingByName) {
        if (room.status === 'waiting') {
          // Waiting holatida — eski yozuvni yangi socket.id bilan yangilash (reconnect)
          existingByName.id = socket.id;
          if (room.scores[existingByName.id] === undefined) {
            room.scores[socket.id] = existingByName.score || 0;
          }
          socket.join(pin);
          io.to(room.hostId).emit('player_joined', { players: room.players });
          return socket.emit('joined', { pin, name: existingByName.name, testId: room.testId });
        } else {
          // O'yin boshlangan — bir xil ism bilan qayta urinish, lekin boshqa odam ham bo'lishi mumkin
          return socket.emit('error', `"${existingByName.name}" ismi allaqachon band. Boshqa ism kiriting.`);
        }
      }

      // 4. O'yin boshlangan bo'lsa — yangi o'quvchi kira olmaydi
      if (room.status !== 'waiting') {
        return socket.emit('error', 'O\'yin allaqachon boshlangan. Keyingi o\'yinni kuting.');
      }

      // 5. Ism bo'sh bo'lsa — bloklash
      if (!name || !name.trim()) {
        return socket.emit('error', 'Iltimos, ismingizni kiriting.');
      }

      // 6. Normal qo'shish
      room.players.push({ id: socket.id, name: name.trim(), score: 0 });
      room.scores[socket.id] = 0;
      socket.join(pin);

      // Hostga xabar berish
      io.to(room.hostId).emit('player_joined', { players: room.players });
      socket.emit('joined', { pin, name: name.trim(), testId: room.testId });
    });


    // Host starts the game
    socket.on('start_game', ({ pin }) => {
      const room = liveRooms.get(pin);
      if (room && room.hostId === socket.id) {
        room.status = 'active';
        room.currentQuestion = 0;
        room.answeredMap = {}; // Har bir savolga javob berilganini kuzatish uchun yangi Map
        io.to(pin).emit('game_started');
        io.to(pin).emit('new_question', { questionIndex: room.currentQuestion });
      }
    });

    // Host moves to next question
    socket.on('next_question', ({ pin }) => {
      const room = liveRooms.get(pin);
      if (room && room.hostId === socket.id) {
        room.currentQuestion++;
        // Yangi savolda barcha o'quvchilarning "answered" holatini tozala
        room.answeredMap = {};
        io.to(pin).emit('new_question', { questionIndex: room.currentQuestion });
      }
    });


    // Student submits answer
    socket.on('submit_answer', ({ pin, isCorrect }) => {
      const room = liveRooms.get(pin);
      if (!room || room.status !== 'active') return;

      // O'quvchi ro'yxatda ekanligini tekshir
      const player = room.players.find(p => p.id === socket.id);
      if (!player) return;

      // Duplicate answer bloklash: har bir o'quvchi uchun qaysi savollarga javob berganini kuzat
      if (!room.answeredMap) room.answeredMap = {}; // { socketId: Set<questionIndex> }
      if (!room.answeredMap[socket.id]) room.answeredMap[socket.id] = new Set();

      const currentQ = room.currentQuestion;
      if (room.answeredMap[socket.id].has(currentQ)) {
        // Allaqachon javob berilgan — ikkinchi emit ni e'tiborsiz qoldirish
        return;
      }
      room.answeredMap[socket.id].add(currentQ);

      // Ball hisoblash (faqat to'g'ri javobda)
      if (isCorrect) {
        if (room.scores[socket.id] === undefined) room.scores[socket.id] = 0;
        room.scores[socket.id] += 100;
        player.score = room.scores[socket.id];
      }

      // Hostga leaderboard yangilash
      io.to(room.hostId).emit('leaderboard_update', { players: room.players });
    });


    socket.on('end_game', ({ pin }) => {
      const room = liveRooms.get(pin);
      if (!room || room.hostId !== socket.id) return;
      io.to(pin).emit('game_ended', { players: room.players });
      liveRooms.delete(pin);
    });

    socket.on('live_disqualify', ({ pin }) => {
      const room = liveRooms.get(pin);
      if (room) {
        const player = room.players.find(p => p.id === socket.id);
        if (player) {
          player.score = 0;
          room.scores[socket.id] = 0;
          io.to(room.hostId).emit('leaderboard_update', { players: room.players });
        }
      }
    });

    // ==========================================
    // 1v1 DUEL SOCKET LOGIC
    // ==========================================

    socket.on('create_duel', ({ testId, name }) => {
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      duelRooms.set(pin, {
        testId,
        player1: { id: socket.id, name, score: 0, currentQuestion: 0, finished: false },
        player2: null,
        status: 'waiting' // waiting, active, finished
      });
      socket.join(pin);
      socket.emit('duel_created', { pin, testId });
    });

    socket.on('join_duel', ({ pin, name }) => {
      const room = duelRooms.get(pin);
      if (!room) {
        return socket.emit('error', 'Duyel topilmadi yoki xato PIN kod');
      }
      if (room.player2) {
        return socket.emit('error', 'Ushbu duyel allaqachon to\'lgan');
      }
      if (room.status !== 'waiting') {
        return socket.emit('error', 'Duyel allaqachon boshlangan');
      }
      
      room.player2 = { id: socket.id, name, score: 0, currentQuestion: 0, finished: false };
      socket.join(pin);
      
      // Notify both players that duel can start
      io.to(pin).emit('duel_ready', { 
        player1: room.player1.name, 
        player2: room.player2.name,
        testId: room.testId
      });
    });

    socket.on('rejoin_duel', ({ pin, name, isCreator }) => {
      const room = duelRooms.get(pin);
      if (!room) {
        return socket.emit('error', 'Duyel xonasi topilmadi. Qaytadan boshlash uchun sahifani yangilang.');
      }
      
      socket.join(pin);
      if (isCreator) {
        room.player1.id = socket.id;
      } else if (room.player2 && room.player2.name === name) {
        room.player2.id = socket.id;
      }
      
      io.to(pin).emit('duel_update', {
        player1: room.player1,
        player2: room.player2
      });
    });

    socket.on('start_duel', ({ pin }) => {
      const room = duelRooms.get(pin);
      if (!room) {
        return socket.emit('error', 'Duyel topilmadi');
      }
      if (socket.id !== room.player1.id) {
        return socket.emit('error', 'Faqat xona yaratuvchisi duyelni boshlashi mumkin');
      }
      room.status = 'active';
      io.to(pin).emit('duel_started');
    });

    socket.on('duel_progress', ({ pin, score, currentQuestion }) => {
      const room = duelRooms.get(pin);
      if (!room) return;

      // Update state
      let isP1 = room.player1.id === socket.id;
      if (isP1) {
        room.player1.score = score;
        room.player1.currentQuestion = currentQuestion;
      } else if (room.player2 && room.player2.id === socket.id) {
        room.player2.score = score;
        room.player2.currentQuestion = currentQuestion;
      }

      // Broadcast update to the room
      io.to(pin).emit('duel_update', {
        player1: room.player1,
        player2: room.player2
      });
    });

    socket.on('duel_finish', ({ pin }) => {
      const room = duelRooms.get(pin);
      if (!room) return;

      if (room.player1.id === socket.id) room.player1.finished = true;
      if (room.player2 && room.player2.id === socket.id) room.player2.finished = true;

      // Broadcast update so both see who finished
      io.to(pin).emit('duel_update', {
        player1: room.player1,
        player2: room.player2
      });

      if (room.player1.finished && (room.player2 ? room.player2.finished : true)) {
        room.status = 'finished';
        io.to(pin).emit('duel_ended', {
          player1: room.player1,
          player2: room.player2
        });
        duelRooms.delete(pin);
      }
    });

    socket.on('duel_disqualify', ({ pin, name }) => {
      const room = duelRooms.get(pin);
      if (!room) return;

      if (room.player1.id === socket.id) {
        room.player1.cheated = true;
        room.player1.finished = true;
      } else if (room.player2 && room.player2.id === socket.id) {
        room.player2.cheated = true;
        room.player2.finished = true;
      }

      io.to(pin).emit('duel_update', {
        player1: room.player1,
        player2: room.player2
      });

      room.status = 'finished';
      io.to(pin).emit('duel_ended', {
        player1: room.player1,
        player2: room.player2,
        disqualifiedPlayer: name
      });
      duelRooms.delete(pin);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      for (const [pin, room] of liveRooms.entries()) {
        if (room.hostId === socket.id) {
          // Host disconnected
          io.to(pin).emit('error', 'O\'qituvchi aloqani uzdi.');
          liveRooms.delete(pin);
        } else {
          // Player disconnected
          const pIndex = room.players.findIndex(p => p.id === socket.id);
          if (pIndex !== -1) {
            room.players.splice(pIndex, 1);
            io.to(room.hostId).emit('player_left', { players: room.players });
          }
        }
      }

      // Duel disconnect handling
      for (const [pin, room] of duelRooms.entries()) {
        if (room.status === 'active') {
          if (room.player1.id === socket.id) {
            room.player1.cheated = true;
            room.player1.finished = true;
            room.player1.score = 0;
            io.to(pin).emit('duel_ended', {
              player1: room.player1,
              player2: room.player2,
              disqualifiedPlayer: room.player1.name
            });
            duelRooms.delete(pin);
          } else if (room.player2 && room.player2.id === socket.id) {
            room.player2.cheated = true;
            room.player2.finished = true;
            room.player2.score = 0;
            io.to(pin).emit('duel_ended', {
              player1: room.player1,
              player2: room.player2,
              disqualifiedPlayer: room.player2.name
            });
            duelRooms.delete(pin);
          }
        }
      }
    });
  });
};
