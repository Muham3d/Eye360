document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      let isValid = true;
      const email = document.getElementById('email-address');
      const password = document.getElementById('password');
      const emailError = document.getElementById('email-error');
      const passwordError = document.getElementById('password-error');

      // Reset errors
      if (email) email.classList.remove('error-state');
      if (password) password.classList.remove('error-state');
      if (emailError) emailError.classList.add('hidden');
      if (passwordError) passwordError.classList.add('hidden');

      if (email && (!email.value || !email.value.includes('@'))) {
        email.classList.add('error-state');
        if (emailError) emailError.classList.remove('hidden');
        isValid = false;
      }

      if (password && !password.value) {
        password.classList.add('error-state');
        if (passwordError) passwordError.classList.remove('hidden');
        isValid = false;
      }

      if (!isValid) {
        e.preventDefault();
      }
    });
  }

  // Clear errors on input
  const emailInput = document.getElementById('email-address');
  if (emailInput) {
    emailInput.addEventListener('input', function() {
      this.classList.remove('error-state');
      const emailError = document.getElementById('email-error');
      if (emailError) emailError.classList.add('hidden');
    });
  }

  const passwordInput = document.getElementById('password');
  if (passwordInput) {
    passwordInput.addEventListener('input', function() {
      this.classList.remove('error-state');
      const passwordError = document.getElementById('password-error');
      if (passwordError) passwordError.classList.add('hidden');
    });
  }
});
