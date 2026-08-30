function initArticleToc(){
  const shell = document.querySelector('.wrap-article');
  const body = document.querySelector('.article-body');
  const nav = document.getElementById('articleToc');
  if(!shell || !body || !nav) return;
  const headings = Array.from(body.querySelectorAll('h2'));
  if(!headings.length){ shell.classList.add('no-toc'); return; }
  headings.forEach((h,i) => { if(!h.id) h.id = 'toc-section-' + i; });
  nav.innerHTML = '<h4>Content</h4>' + headings.map(h => `<a href="#${h.id}">${h.textContent}</a>`).join('');
  const links = Array.from(nav.querySelectorAll('a'));
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        links.forEach(l => l.classList.remove('active'));
        const link = nav.querySelector(`a[href="#${entry.target.id}"]`);
        if(link) link.classList.add('active');
      }
    });
  }, { rootMargin: '-15% 0px -75% 0px' });
  headings.forEach(h => observer.observe(h));
}
initArticleToc();
