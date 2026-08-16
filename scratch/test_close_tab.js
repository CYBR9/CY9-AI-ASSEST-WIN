const { exec } = require('child_process');

function closeTab() {
  const cmd = `powershell -NoProfile -Command "$w = New-Object -ComObject Wscript.Shell; $w.SendKeys('^w')"`;
  exec(cmd, (err, stdout, stderr) => {
    console.log('Close tab result:', { err, stdout, stderr });
  });
}
closeTab();
