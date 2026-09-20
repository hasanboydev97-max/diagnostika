export const downloadDesktopShortcut = (testId: string, testTitle: string) => {
  const link = `${window.location.origin}/online-tests/take/${testId}`;
  
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  let content = '';
  let filename = '';

  if (isMac) {
    // macOS .webloc format
    content = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>URL</key>
    <string>${link}</string>
</dict>
</plist>`;
    filename = `${testTitle}.webloc`;
  } else {
    // Windows .url format
    content = `[InternetShortcut]\nURL=${link}\nIconIndex=0`;
    filename = `${testTitle}.url`;
  }

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = objectUrl;
  
  // Safe filename, keeping Cyrillic and Latin chars
  const safeTitle = (testTitle || 'Test').replace(/[^a-zA-Z0-9_\- \u0400-\u04FF]/g, '').trim();
  a.download = filename.replace(testTitle, safeTitle || 'Test_Yorliq');
  
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
};
