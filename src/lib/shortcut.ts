export const downloadDesktopShortcut = (testId: string, testTitle: string) => {
  const link = `${window.location.origin}/online-tests/take/${testId}`;
  
  // Safe filename, keeping Cyrillic and Latin chars
  const safeTitle = (testTitle || 'Test').replace(/[^a-zA-Z0-9_\- \u0400-\u04FF]/g, '').trim() || 'Test_Yorliq';
  
  const content = `<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0; url=${link}">
    <title>${safeTitle}</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #fdfdfd; color: #111; }
        .card { padding: 30px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); background: white; text-align: center; border: 1px solid #eee; }
        h1 { margin: 0 0 10px 0; font-size: 20px; }
        p { color: #666; margin-bottom: 20px; }
        a { display: inline-block; padding: 12px 24px; background: #111; color: white; text-decoration: none; border-radius: 10px; font-weight: bold; transition: opacity 0.2s; }
        a:hover { opacity: 0.8; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Yuklanmoqda...</h1>
        <p>"${safeTitle}" testiga o'tilmoqda.</p>
        <a href="${link}">Agar o'tmasa, bu yerni bosing</a>
    </div>
    <script>window.location.href = "${link}";</script>
</body>
</html>`;

  const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = `${safeTitle}.html`;
  
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
};
