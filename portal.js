/**
 * FloodGuard - Portal Selection Interactivity
 */
(function(){
  var msg = document.getElementById('msg'), t;
  document.querySelectorAll('.btn').forEach(function(b){
    b.addEventListener('click', function(){
      // replace this with your real login page, e.g. location.href = 'citizen-login.html';
      msg.textContent = 'Opening ' + b.dataset.go + ' login...';
      msg.classList.add('show');
      clearTimeout(t);
      t = setTimeout(function(){ msg.classList.remove('show'); }, 2200);
    });
  });
})();
