function _showCompletion() {
  const el = document.getElementById("task-complete");
  if (el) el.style.display = "block";
  _removeZoneMarkers()
  setTimeout(() => showCompletionScreen(), 2000);
}
