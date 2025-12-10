document.addEventListener('DOMContentLoaded', function() {
    // If user is already logged in, redirect to homepage
    if (checkAuth()) {
        window.location.href = 'index.html';
        return;
    }

    // Login form submission
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // Basic validation
        if (!username || !password) {
            showMessage('Please enter username and password', 'warning');
            return;
        }

        const submitBtn = this.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';

        try {
            // Directly use fetch API to avoid dependency on problematic modules
            const response = await fetch('http://localhost:8000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });

            const result = await response.json();

            if (response.ok && result.access_token) {
                // Login successful - use unified key name access_token
                localStorage.setItem('access_token', result.access_token);

                // Get user information
                try {
                    const userResponse = await fetch('http://localhost:8000/api/auth/me', {
                        headers: {
                            'Authorization': `Bearer ${result.access_token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (userResponse.ok) {
                        const userData = await userResponse.json();
                        localStorage.setItem('current_user', JSON.stringify(userData));
                        console.log('User information saved:', userData);
                    }
                } catch (userError) {
                    console.error('Failed to get user information:', userError);
                    // If getting user info fails, parse basic info from token
                    try {
                        const payload = JSON.parse(atob(result.access_token.split('.')[1]));
                        const basicUserInfo = {
                            user_id: payload.user_id,
                            username: payload.username,
                            user_name: payload.user_name
                        };
                        localStorage.setItem('current_user', JSON.stringify(basicUserInfo));
                    } catch (parseError) {
                        console.error('Failed to parse token:', parseError);
                    }
                }

                showMessage('Login successful!', 'success');

                // Delay redirect to let user see success message
                setTimeout(() => {
                    const urlParams = new URLSearchParams(window.location.search);
                    const redirect = urlParams.get('redirect');
                    window.location.href = redirect || 'index.html';
                }, 1500);
            } else {
                // Login failed
                const errorMessage = result.detail || 'Username or password incorrect';
                showMessage(errorMessage, 'danger');
            }
        } catch (error) {
            console.error('Login failed:', error);
            showMessage('Network error, please check if backend service is running', 'danger');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Login';
        }
    });
});

// Simple message display function (commented out)
// function showMessage(message, type = 'info') {
//     // Remove existing messages
//     const existingAlerts = document.querySelectorAll('.alert');
//     existingAlerts.forEach(alert => alert.remove());
//
//     // Create new message element
//     const alertDiv = document.createElement('div');
//     alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
//     alertDiv.innerHTML = `
//         ${message}
//         <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
//     `;
//
//     // Add to form container
//     const formContainer = document.querySelector('.form-container');
//     formContainer.insertBefore(alertDiv, formContainer.firstChild);
//
//     // Automatically disappear after 3 seconds
//     setTimeout(() => {
//         if (alertDiv.parentNode) {
//             alertDiv.remove();
//         }
//     }, 3000);
// }

// Simple function to check authentication status - using unified key name
function checkAuth() {
    return !!localStorage.getItem('access_token');
}