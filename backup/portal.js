/**
 * FloodGuard - Portal Selection Interactivity
 */
(function(){
  var msg = document.getElementById('msg'), t;
  document.querySelectorAll('.btn').forEach(function(b){
    b.addEventListener('click', function(){
      var portal = b.dataset.go;

      if (portal === 'Citizen Portal') {
        window.location.href = 'citizen-login.html';
        return;
      }

      // For other portals, show a temporary message (replace with real links later)
      msg.textContent = 'Opening ' + portal + ' login...';
      msg.classList.add('show');
      clearTimeout(t);
      t = setTimeout(function(){ msg.classList.remove('show'); }, 2200);
    });
  });
})();
