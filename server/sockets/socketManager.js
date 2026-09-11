import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

// KRITIK-6 FIX: CORS '*' o'rniga aniq domenlar ro'yxati
const ALLOWED_ORIGINS = [
  'https://bmdiagnostika.vercel.app',
  'https://hbdiagnostika.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

// Socket room TTL: 2 soat (O'RTA-9 fix)
const ROOM_TTL_MS = 2 * 60 * 60 * 1000;

export const setupSockets = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: ALLOWED_ORIGINS,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Live Kahoot Rooms
  const liveRooms = new Map();

  // Duel Rooms
  const duelRooms = new Map();

  // KRITIK-7 FIX: JWT middleware — o'qituvchi socketlari uchun autentifikatsiya
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          // JWT_SECRET yo'q — teacher funksiyalarini bloklash, student uchun davom etish
          socket.isTeacher = false;
          return next();
        }
        const decoded = jwt.verify(token, secret);
        socket.teacherId = decoded.id;
        socket.userRole = decoded.role || 'teacher';
        socket.isTeacher = true;
      } catch {
        // Token xato — student sifatida davom etish (token majburiy emas students uchun)
        socket.isTeacher = false;
      }
    } else {
      socket.isTeacher = false;
    }
    next();
  });

  io.on('connection', (socket) => {
    // Faqat development'da log
    if (process.env.NODE_ENV !== 'production') {
      console.log('Socket connected:', socket.id, socket.isTeacher ? '[Teacher]' : '[Student]');
    }

    // Teacher creates a room — KRITIK-7: faqat auth o'qituvchilar
    socket.on('host_room', ({ testId }) => {
      // Faqat autentifikatsiyadan o'tgan o'qituvchilar xona ocha olsin
      if (!socket.isTeacher) {
        return socket.emit('error', 'Xona ochish uchun tizimga kirish talab qilinadi.');
      }

      // Generate 6-digit pin
      const pin = Math.floor(100000 + Math.random() * 900000).toString();

      // O'RTA-9 FIX: TTL mexanizmi — 2 soatdan keyin xona avtomatik yopiladi
      const ttlTimer = setTimeout(() => {
        if (liveRooms.has(pin)) {
          io.to(pin).emit('error', 'Xona vaqti tugadi (2 soat). Yangi xona oching.');
          liveRooms.delete(pin);
        }
      }, ROOM_TTL_MS);

      liveRooms.set(pin, {
        pin,
        hostId: socket.id,
        teacherId: socket.teacherId,
        testId,
        status: 'waiting', // waiting | active | finished
        currentQuestion: -1,
        players: [],
        scores: {},
        createdAt: Date.now(),
        ttlTimer
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
        return socket.emit('joined', { pin, name: alreadyById.name, testId: room.testId });
      }

      // 3. Reconnect: bir xil ism bilan qayta ulanish
      const existingByName = room.players.find(
        p => p.name.trim().toLowerCase() === (name || '').trim().toLowerCase()
      );
      if (existingByName) {
        if (room.status === 'waiting') {
          existingByName.id = socket.id;
          if (room.scores[existingByName.id] === undefined) {
            room.scores[socket.id] = existingByName.score || 0;
          }
          socket.join(pin);
          io.to(room.hostId).emit('player_joined', { players: room.players });
          return socket.emit('joined', { pin, name: existingByName.name, testId: room.testId });
        } else {
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

      // 6. Ism sanitizatsiyasi — XSS va injectiondan himoya
      const safeName = name.trim().replace(/[<>]/g, '').substring(0, 50);

      // 7. Normal qo'shish
      room.players.push({ id: socket.id, name: safeName, score: 0 });
      room.scores[socket.id] = 0;
      socket.join(pin);

      io.to(room.hostId).emit('player_joined', { players: room.players });
      socket.emit('joined', { pin, name: safeName, testId: room.testId });
    });


    // Host starts the game — faqat xona egasi
    socket.on('start_game', ({ pin }) => {
      const room = liveRooms.get(pin);
      if (room && room.hostId === socket.id) {
        room.status = 'active';
        room.currentQuestion = 0;
        room.answeredMap = {};
        io.to(pin).emit('game_started');
        io.to(pin).emit('new_question', { questionIndex: room.currentQuestion });
      }
    });

    // Host moves to next question — faqat xona egasi
    socket.on('next_question', ({ pin }) => {
      const room = liveRooms.get(pin);
      if (room && room.hostId === socket.id) {
        room.currentQuestion++;
        room.answeredMap = {};
        io.to(pin).emit('new_question', { questionIndex: room.currentQuestion });
      }
    });


    // Student submits answer
    socket.on('submit_answer', ({ pin, isCorrect }) => {
      const room = liveRooms.get(pin);
      if (!room || room.status !== 'active') return;

      const player = room.players.find(p => p.id === socket.id);
      if (!player) return;

      if (!room.answeredMap) room.answeredMap = {};
      if (!room.answeredMap[socket.id]) room.answeredMap[socket.id] = new Set();

      const currentQ = room.currentQuestion;
      if (room.answeredMap[socket.id].has(currentQ)) {
        return; // Allaqachon javob berilgan
      }
      room.answeredMap[socket.id].add(currentQ);

      if (isCorrect) {
        if (room.scores[socket.id] === undefined) room.scores[socket.id] = 0;
        room.scores[socket.id] += 100;
        player.score = room.scores[socket.id];
      }

      io.to(room.hostId).emit('leaderboard_update', { players: room.players });
    });


    socket.on('end_game', ({ pin }) => {
      const room = liveRooms.get(pin);
      if (!room || room.hostId !== socket.id) return;
      clearTimeout(room.ttlTimer); // TTL timerni tozalash
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

      const ttlTimer = setTimeout(() => {
        if (duelRooms.has(pin)) {
          io.to(pin).emit('error', 'Duyel vaqti tugadi (2 soat).');
          duelRooms.delete(pin);
        }
      }, ROOM_TTL_MS);

      duelRooms.set(pin, {
        testId,
        player1: { id: socket.id, name, score: 0, currentQuestion: 0, finished: false },
        player2: null,
        status: 'waiting',
        ttlTimer
      });
      socket.join(pin);
      socket.emit('duel_created', { pin, testId });
    });

    socket.on('join_duel', ({ pin, name }) => {
      const room = duelRooms.get(pin);
      if (!room) {
        return socket.emit('error', 'Duyel topilmadi yoki xato PIN kod');
      }
      
      const safeName = (name || '').trim().replace(/[<>]/g, '').substring(0, 50);

      if (room.player2) {
        // MUHIM FIX: O'yinchi kutilmaganda uzilib yana kirsa (reconnect), uni rad etmaymiz.
        if (room.player2.name.toLowerCase() === safeName.toLowerCase()) {
          room.player2.id = socket.id;
          socket.join(pin);
          return io.to(pin).emit('duel_ready', {
            player1: room.player1.name,
            player2: room.player2.name,
            testId: room.testId
          });
        }
        return socket.emit('error', 'Ushbu duyel allaqachon to\'lgan');
      }
      if (room.status !== 'waiting') {
        return socket.emit('error', 'Duyel allaqachon boshlangan');
      }

      room.player2 = { id: socket.id, name: safeName, score: 0, currentQuestion: 0, finished: false };
      socket.join(pin);

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

      // MUHIM FIX: O'yinchi yangilanganda unga mavjud holatni jo'natamiz
      socket.emit('duel_sync', {
        status: room.status,
        testId: room.testId,
        player1: room.player1,
        player2: room.player2
      });

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

      let isP1 = room.player1.id === socket.id;
      if (isP1) {
        room.player1.score = score;
        room.player1.currentQuestion = currentQuestion;
      } else if (room.player2 && room.player2.id === socket.id) {
        room.player2.score = score;
        room.player2.currentQuestion = currentQuestion;
      }

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

      io.to(pin).emit('duel_update', {
        player1: room.player1,
        player2: room.player2
      });

      if (room.player1.finished && (room.player2 ? room.player2.finished : true)) {
        room.status = 'finished';
        clearTimeout(room.ttlTimer);
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
      clearTimeout(room.ttlTimer);
      io.to(pin).emit('duel_ended', {
        player1: room.player1,
        player2: room.player2,
        disqualifiedPlayer: name
      });
      duelRooms.delete(pin);
    });

    socket.on('disconnect', () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Client disconnected:', socket.id);
      }

      // LiveRooms cleanup
      for (const [pin, room] of liveRooms.entries()) {
        if (room.hostId === socket.id) {
          clearTimeout(room.ttlTimer);
          io.to(pin).emit('error', 'O\'qituvchi aloqani uzdi.');
          liveRooms.delete(pin);
        } else {
          const pIndex = room.players.findIndex(p => p.id === socket.id);
          if (pIndex !== -1) {
            room.players.splice(pIndex, 1);
            io.to(room.hostId).emit('player_left', { players: room.players });
          }
        }
      }

      // MUHIM FIX: Disconnect bo'lganda o'yinchini darhol chetlashtirmaymiz!
      // Agar o'yinchi sahifani yangilasa (refresh) yoki interneti 1 soniyaga uzilsa, u darhol yutqazib qo'ymaydi.
      // Qoidabuzarlikni (cheating) front-end'dagi proctoring (blur, tab switch) nazorat qiladi.
    });
  });
};
