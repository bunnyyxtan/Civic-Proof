try {
  console.log("Attempting to kill PID 1...");
  process.kill(1, 'SIGKILL');
} catch (e) {
  console.log("Error:", e.message);
}
