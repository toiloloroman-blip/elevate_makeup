/* =========================================================
   ELEVATE MAKEUP - behaviour
   Loader, nav, reveals, album lightbox, 2-step inquiry modal.
   No dependencies, no build step.
   ========================================================= */
(function () {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* ------------------------------------------------ loader */
  window.addEventListener('load', function () {
    const l = $('#loader');
    if (!l) return;
    setTimeout(() => l.classList.add('done'), 1750);
    setTimeout(() => { l.style.display = 'none'; }, 2500);
  });

  /* ------------------------------------------------ nav */
  const header = $('header');
  const onScroll = () => header && header.classList.toggle('stuck', window.scrollY > 30);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const burger = $('#burger');
  const links = $('#navlinks');
  function closeNav() {
    if (!burger) return;
    burger.classList.remove('open');
    links.classList.remove('open');
    document.body.classList.remove('locked');
  }
  if (burger) {
    burger.addEventListener('click', () => {
      const open = burger.classList.toggle('open');
      links.classList.toggle('open', open);
      // lock the page behind the menu -- without this the body scrolls
      // underneath on iOS and you can't tell the menu is a layer
      document.body.classList.toggle('locked', open);
    });
    $$('#navlinks a').forEach(a => a.addEventListener('click', closeNav));
  }

  /* ------------------------------------------------ reveals */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.rv').forEach((el, i) => { el.style.transitionDelay = (i % 4) * 70 + 'ms'; io.observe(el); });

  /* ------------------------------------------------ albums */
  const ALBUMS = {
    beauty: {
      title: 'Beauty & Editorial',
      shots: ['ed-01', 'ed-02', 'ed-03', 'ed-04', 'ed-05', 'ed-06']
    },
    bridal: {
      title: 'Bridal',
      shots: ['br-01', 'br-02', 'br-03', 'br-04', 'br-05', 'br-06']
    }
  };

  /* the fanned preview on each album card. Three real frames, picked so the
     card never leads with an awkward crop. The card itself is a plain link to
     the gallery page -- no lightbox, the work gets its own page. */
  const FAN = { beauty: [3, 1, 4], bridal: [1, 2, 5] };

  $$('.album-card').forEach(card => {
    const a = ALBUMS[card.dataset.album];
    const fan = $('.fan', card);
    if (!a || !fan || fan.children.length) return;
    fan.innerHTML = (FAN[card.dataset.album] || [0, 1, 2])
      .map(i => '<img src="assets/img/' + a.shots[i] + '.jpg" loading="lazy" alt="">').join('');
  });

  /* gallery page: lay the whole set out, uncropped, at face value */
  const grid = $('#gallery-grid');
  if (grid) {
    const a = ALBUMS[grid.dataset.album];
    if (a) {
      grid.innerHTML = a.shots.map(s =>
        '<figure><img src="assets/img/' + s + '.jpg" loading="lazy" alt="' +
        a.title + ' makeup by Tamara Boyd"></figure>').join('');
    }
  }

  /* ------------------------------------------------ inquiry modal */
  const modal = $('#inq');
  const pick = { service: '', faces: '', date: '', where: '' };

  function openInq(preset) {
    if (!modal) return;
    if (preset) {
      pick.service = preset;
      $$('#svc .chip-card').forEach(c => c.classList.toggle('on', c.dataset.v === preset));
    }
    goStep(1);
    modal.classList.add('open');
    document.body.classList.add('locked');
  }
  function closeInq() {
    if (!modal) return;
    modal.classList.remove('open');
    document.body.classList.remove('locked');
  }
  function goStep(n) {
    $$('.inq-step').forEach(s => { s.hidden = +s.dataset.step !== n; });
  }

  $$('[data-inquire]').forEach(b =>
    b.addEventListener('click', e => { e.preventDefault(); openInq(b.dataset.inquire || ''); }));
  if (modal) {
    $('#inq-x').addEventListener('click', closeInq);
    $('#inq-bg').addEventListener('click', closeInq);
    $('#inq-back').addEventListener('click', () => goStep(1));

    // chip groups write straight into `pick`
    $$('#svc .chip-card').forEach(c => c.addEventListener('click', () => {
      $$('#svc .chip-card').forEach(o => o.classList.remove('on'));
      c.classList.add('on'); pick.service = c.dataset.v; $('#e1').classList.remove('show');
    }));
    $$('#faces .chip').forEach(c => c.addEventListener('click', () => {
      $$('#faces .chip').forEach(o => o.classList.remove('on'));
      c.classList.add('on'); pick.faces = c.dataset.v;
    }));

    $('#inq-next').addEventListener('click', () => {
      if (!pick.service) { $('#e1').classList.add('show'); return; }
      pick.date = $('#f-date').value;
      pick.where = $('#f-where').value.trim();
      $('#recap').textContent = [pick.service, pick.faces, pick.date, pick.where]
        .filter(Boolean).join('  |  ');
      goStep(2);
    });

    const W3_KEY = 'ff5b0a82-14fd-4930-ae3c-eb2c005123e8';

    $('#inq-send').addEventListener('click', async () => {
      const btn = $('#inq-send');
      const name = $('#f-name').value.trim();
      const email = $('#f-email').value.trim();
      if (!name || !email) { $('#e2').classList.add('show'); return; }
      $('#e2').classList.remove('show');

      const phone = $('#f-phone').value.trim();
      const src = $('#f-src').value.trim();
      const msg = $('#f-msg').value.trim();

      const payload = {
        access_key: W3_KEY,
        subject: 'New inquiry - ' + (pick.service || 'Makeup') + ' - ' + name,
        from_name: 'Elevate Makeup Website',
        // so hitting reply in her inbox goes straight back to the client
        replyto: email,
        Service: pick.service || '-',
        Faces: pick.faces || '-',
        Date: pick.date || '-',
        'Location / venue': pick.where || '-',
        Name: name,
        Email: email,
        Phone: phone || '-',
        'Found her via': src || '-',
        Message: msg || '-'
      };

      const label = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = 'Sending...';

      try {
        const r = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload)
        });
        const out = await r.json();
        if (!out.success) throw new Error(out.message || 'send failed');
        goStep(3);
      } catch (err) {
        // never lose an inquiry to a flaky connection -- fall back to her inbox
        const body = Object.entries(payload)
          .filter(([k]) => !['access_key', 'subject', 'from_name', 'replyto'].includes(k))
          .map(([k, v]) => k + ': ' + v).join('\n');
        window.location.href = 'mailto:Tamara_mua@yahoo.com'
          + '?subject=' + encodeURIComponent(payload.subject)
          + '&body=' + encodeURIComponent(body);
        goStep(3);
      } finally {
        btn.disabled = false;
        btn.innerHTML = label;
      }
    });
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeInq(); closeNav(); }
  });

  $('#yr') && ($('#yr').textContent = new Date().getFullYear());
})();
