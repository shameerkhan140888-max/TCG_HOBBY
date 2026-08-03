(function () {
  const form = document.getElementById('launch-list-form');
  const email = document.getElementById('launch-email');
  const consent = document.getElementById('launch-consent');
  const website = document.getElementById('launch-website');
  const status = document.getElementById('launch-list-status');
  const submit = form ? form.querySelector('button[type="submit"]') : null;

  if (!form || !email || !consent || !status || !submit) return;

  const setStatus = (message, type) => {
    status.textContent = message;
    status.classList.toggle('error', type === 'error');
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = email.value.trim().toLowerCase();

    if (!email.checkValidity()) {
      setStatus('Enter a valid email address.', 'error');
      email.focus();
      return;
    }

    if (!consent.checked) {
      setStatus('Please tick the consent box to join the launch list.', 'error');
      consent.focus();
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Joining...';
    setStatus('', 'info');

    fetch('/api/launch-list', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: value,
        consent: consent.checked,
        website: website ? website.value : '',
      }),
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message || 'Signup failed.');
        setStatus(payload.duplicate ? 'You are already on the Iron Sprue launch list.' : 'You are on the Iron Sprue launch list. Please check your email for confirmation.', 'info');
        form.reset();
      })
      .catch(() => {
        setStatus('Sorry, signup is temporarily unavailable. Please try again later.', 'error');
      })
      .finally(() => {
        submit.disabled = false;
        submit.textContent = submit.dataset.submitLabel || 'Join launch list';
      });
  });

  const carousel = document.querySelector('[data-carousel]');
  const track = document.querySelector('[data-carousel-track]');
  const previous = document.querySelector('[data-carousel-prev]');
  const next = document.querySelector('[data-carousel-next]');

  if (!carousel || !track || !previous || !next) return;

  let currentIndex = 0;
  const cards = Array.from(track.children);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const updateCarousel = () => {
    track.style.transform = `translateX(calc(${currentIndex} * -1 * (100% / ${cards.length})))`;
  };

  const move = (direction) => {
    currentIndex = (currentIndex + direction + cards.length) % cards.length;
    updateCarousel();
  };

  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  carousel.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') move(-1);
    if (event.key === 'ArrowRight') move(1);
  });

  if (!reduceMotion) {
    let timer = window.setInterval(() => move(1), 5000);
    carousel.addEventListener('pointerdown', () => {
      window.clearInterval(timer);
      timer = 0;
    }, { once: true });
  }
})();
