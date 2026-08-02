(function () {
  const form = document.getElementById('launch-list-form');
  const email = document.getElementById('launch-email');
  const status = document.getElementById('launch-list-status');
  const storageKey = 'ironSprueLaunchListEmail';

  if (!form || !email || !status) return;

  const setStatus = (message, type) => {
    status.textContent = message;
    status.classList.toggle('error', type === 'error');
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = email.value.trim().toLowerCase();

    if (!email.checkValidity()) {
      setStatus('Enter a valid email address before preparing the signup email.', 'error');
      email.focus();
      return;
    }

    if (localStorage.getItem(storageKey) === value) {
      setStatus('This browser has already prepared a launch-list request for that address. Send the draft if you have not already done so.', 'info');
      return;
    }

    localStorage.setItem(storageKey, value);
    const subject = encodeURIComponent('Iron Sprue launch list signup');
    const body = encodeURIComponent(`Please add ${value} to the Iron Sprue launch list.\n\nI understand this request is completed only when this email is sent.`);
    window.location.href = `mailto:hello@ironsprue.co.uk?subject=${subject}&body=${body}`;
    setStatus('Your email app should open with a prepared request. Send the draft to complete signup.', 'info');
  });
})();
