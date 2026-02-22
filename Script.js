// Import Firebase
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { 
    collection, 
    addDoc, 
    query, 
    where, 
    deleteDoc, 
    doc, 
    updateDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

// ============================================
// GLOBAL STATE
// ============================================

let goals = [];
let focusTime = 25;
let timerInterval = null;
let isRunning = false;
let currentMonth = new Date();
let selectedCategory = 'All';

const quotes = [
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "Success is not final, failure is not fatal.", author: "Winston Churchill" },
    { text: "Don't watch the clock; do what it does.", author: "Sam Levenson" },
    { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
    { text: "You are never too old to set another goal.", author: "C.S. Lewis" }
];

const categories = ['All', 'Work', 'Health', 'Learning', 'Hobbies', 'Personal'];

// ============================================
// PASSWORD VALIDATION
// ============================================

function validateSignupPassword() {
    const password = document.getElementById('signupPassword').value;
    
    const reqs = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*()_+\-=\[\]{};:'",.<>?/\\|`~]/.test(password)
    };

    // Update requirement indicators
    updateRequirement('req-length', reqs.length);
    updateRequirement('req-uppercase', reqs.uppercase);
    updateRequirement('req-lowercase', reqs.lowercase);
    updateRequirement('req-number', reqs.number);
    updateRequirement('req-special', reqs.special);

    // Update strength meter
    updatePasswordStrength(password, reqs);

    // Validate confirm if filled
    validatePasswordMatch();
}

function updatePasswordStrength(password, reqs) {
    const strengthBars = document.querySelectorAll('.strength-bar');
    const strengthText = document.getElementById('strengthText');
    
    let strength = 0;
    if (reqs.length) strength++;
    if (reqs.uppercase && reqs.lowercase) strength++;
    if (reqs.number) strength++;
    if (reqs.special) strength++;

    // Reset all bars
    strengthBars.forEach(bar => {
        bar.classList.remove('active', 'medium', 'strong');
    });

    // Activate bars based on strength
    if (password.length > 0) {
        if (strength <= 1) {
            strengthBars[0].classList.add('active');
            strengthText.textContent = '❌ Weak password';
            strengthText.style.color = '#fca5a5';
        } else if (strength === 2) {
            strengthBars[0].classList.add('active', 'medium');
            strengthBars[1].classList.add('active', 'medium');
            strengthText.textContent = '⚠️ Fair password';
            strengthText.style.color = '#fcd34d';
        } else if (strength >= 3) {
            strengthBars[0].classList.add('active', 'strong');
            strengthBars[1].classList.add('active', 'strong');
            strengthBars[2].classList.add('active', 'strong');
            strengthBars[3].classList.add('active', 'strong');
            strengthText.textContent = '✅ Strong password';
            strengthText.style.color = '#86efac';
        }
    } else {
        strengthText.textContent = 'Password strength';
        strengthText.style.color = 'var(--text-secondary)';
    }
}

function updateRequirement(id, met) {
    const element = document.getElementById(id);
    if (!element) return;

    const icon = element.querySelector('.req-icon');
    if (met) {
        element.classList.add('met');
        icon.textContent = '✓';
    } else {
        element.classList.remove('met');
        icon.textContent = '○';
    }
}

function validatePasswordMatch() {
    const password = document.getElementById('signupPassword').value;
    const confirm = document.getElementById('signupConfirmPassword').value;
    const matchIcon = document.getElementById('matchIcon');
    const matchError = document.getElementById('matchError');

    if (!confirm) {
        matchIcon.textContent = '';
        matchError.textContent = '';
        return true;
    }

    if (password === confirm) {
        matchIcon.textContent = '✅';
        matchIcon.style.color = 'var(--success)';
        matchError.textContent = '';
        return true;
    } else {
        matchIcon.textContent = '❌';
        matchIcon.style.color = 'var(--error)';
        matchError.textContent = 'Passwords do not match';
        return false;
    }
}

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    input.type = input.type === 'password' ? 'text' : 'password';
}

// ============================================
// AUTHENTICATION
// ============================================

function toggleAuthForms() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    loginForm.classList.toggle('active');
    signupForm.classList.toggle('active');
    
    // Clear forms
    document.getElementById('signupEmail').value = '';
    document.getElementById('signupPassword').value = '';
    document.getElementById('signupConfirmPassword').value = '';
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    
    // Clear errors
    document.getElementById('signupError').style.display = 'none';
    document.getElementById('signupSuccess').style.display = 'none';
    document.getElementById('loginError').style.display = 'none';
}

async function handleSignup() {
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    const btn = document.getElementById('signupBtn');
    const errorDiv = document.getElementById('signupError');
    const successDiv = document.getElementById('signupSuccess');

    // Reset messages
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';

    // Validation
    if (!email || !password || !confirmPassword) {
        showError(errorDiv, '⚠️ Please fill in all fields');
        return;
    }

    if (!isValidEmail(email)) {
        showError(errorDiv, '⚠️ Please enter a valid email');
        return;
    }

    if (password.length < 8) {
        showError(errorDiv, '⚠️ Password must be at least 8 characters');
        return;
    }

    if (password !== confirmPassword) {
        showError(errorDiv, '⚠️ Passwords do not match');
        return;
    }

    // Check password strength
    const reqs = {
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*()_+\-=\[\]{};:'",.<>?/\\|`~]/.test(password)
    };

    if (!(reqs.uppercase && reqs.lowercase && reqs.number && reqs.special)) {
        showError(errorDiv, '⚠️ Password must contain uppercase, lowercase, number, and special character');
        return;
    }

    try {
        btn.disabled = true;
        btn.querySelector('.btn-text').style.display = 'none';
        btn.querySelector('.btn-loader').style.display = 'inline';

        await createUserWithEmailAndPassword(window.auth, email, password);

        showSuccess(successDiv, '✅ Account created! Signing you in...');

        setTimeout(() => {
            // Firebase will handle the redirect via onAuthStateChanged
        }, 1500);

    } catch (error) {
        let message = '❌ Signup failed';
        
        if (error.code === 'auth/email-already-in-use') {
            message = '❌ Email already registered. Please sign in.';
        } else if (error.code === 'auth/invalid-email') {
            message = '❌ Invalid email format.';
        } else if (error.code === 'auth/weak-password') {
            message = '❌ Password is too weak.';
        } else if (error.code === 'auth/operation-not-allowed') {
            message = '❌ Signup is currently disabled.';
        }

        showError(errorDiv, message);

    } finally {
        btn.disabled = false;
        btn.querySelector('.btn-text').style.display = 'inline';
        btn.querySelector('.btn-loader').style.display = 'none';
    }
}

async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginBtn');
    const errorDiv = document.getElementById('loginError');

    errorDiv.style.display = 'none';

    if (!email || !password) {
        showError(errorDiv, '⚠️ Please fill in all fields');
        return;
    }

    try {
        btn.disabled = true;
        btn.querySelector('.btn-text').style.display = 'none';
        btn.querySelector('.btn-loader').style.display = 'inline';

        await signInWithEmailAndPassword(window.auth, email, password);

    } catch (error) {
        let message = '❌ Login failed';
        
        if (error.code === 'auth/user-not-found') {
            message = '❌ Email not found. Please sign up.';
        } else if (error.code === 'auth/wrong-password') {
            message = '❌ Incorrect password.';
        } else if (error.code === 'auth/invalid-email') {
            message = '❌ Invalid email format.';
        } else if (error.code === 'auth/too-many-requests') {
            message = '❌ Too many failed attempts. Try again later.';
        }

        showError(errorDiv, message);

    } finally {
        btn.disabled = false;
        btn.querySelector('.btn-text').style.display = 'inline';
        btn.querySelector('.btn-loader').style.display = 'none';
    }
}

async function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            await signOut(window.auth);
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
}

// ============================================
// HELPERS
// ============================================

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
}

function showSuccess(element, message) {
    element.textContent = message;
    element.style.display = 'block';
}

// ============================================
// APP FUNCTIONS
// ============================================

function init() {
    updateClock();
    updateQuote();
    renderCategories();
    renderCalendar();
    loadGoalsFromFirestore();
    setInterval(updateClock, 1000);
    setInterval(updateQuote, 300000);
}

function updateClock() {
    const now = new Date();
    document.getElementById('current-time').textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('current-date').textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function updateQuote() {
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    document.getElementById('quote-text').textContent = `"${quote.text}"`;
    document.querySelector('.author').textContent = `— ${quote.author}`;
}

function renderCategories() {
    const list = document.getElementById('categoryList');
    list.innerHTML = categories.map(cat => `
        <button class="category-btn ${cat === selectedCategory ? 'active' : ''}" onclick="filterCategory('${cat}')">
            ${getEmoji(cat)} ${cat === 'All' ? 'All Goals' : cat}
        </button>
    `).join('');
}

function getEmoji(category) {
    const emojis = {
        'All': '✨',
        'Work': '💼',
        'Health': '💪',
        'Learning': '🎓',
        'Hobbies': '🎮',
        'Personal': '⭐'
    };
    return emojis[category] || '•';
}

function filterCategory(cat) {
    selectedCategory = cat;
    renderCategories();
    renderGoals();
}

function renderCalendar() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    document.getElementById('monthYear').textContent = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    let html = '';
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    dayLabels.forEach(day => {
        html += `<div class="day-header">${day}</div>`;
    });

    for (let i = firstDay - 1; i >= 0; i--) {
        html += `<div class="day-cell other-month">${daysInPrevMonth - i}</div>`;
    }

    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
        html += `<div class="day-cell ${isToday ? 'today' : ''}">${day}</div>`;
    }

    const totalCells = daysInPrevMonth + firstDay + daysInMonth;
    const remainingCells = 42 - totalCells;
    for (let day = 1; day <= remainingCells; day++) {
        html += `<div class="day-cell other-month">${day}</div>`;
    }

    document.getElementById('calendarGrid').innerHTML = html;
}

function previousMonth() {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    renderCalendar();
}

function nextMonth() {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    renderCalendar();
}

async function loadGoalsFromFirestore() {
    if (!window.currentUser) return;

    try {
        const q = query(collection(window.db, 'goals'), where('userId', '==', window.currentUser.uid));

        onSnapshot(q, (snapshot) => {
            goals = [];
            snapshot.forEach((doc) => {
                goals.push({ id: doc.id, ...doc.data() });
            });
            renderGoals();
        });
    } catch (error) {
        console.error('Error loading goals:', error);
    }
}

function renderGoals() {
    const filtered = selectedCategory === 'All' ? goals : goals.filter(g => g.category === selectedCategory);
    
    if (filtered.length === 0) {
        document.getElementById('goalsGrid').innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 40px;">No goals yet. Create one! 🚀</div>';
        return;
    }

    const html = filtered.map(goal => `
        <div class="goal-card">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                <h4>${goal.title}</h4>
                <input type="checkbox" ${goal.completed ? 'checked' : ''} onchange="toggleGoal('${goal.id}')">
            </div>
            <span class="goal-category">${goal.category}</span>
            <p style="font-size: 12px; color: var(--text-secondary); margin: 10px 0;">${goal.notes || 'No notes'}</p>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${goal.progress}%"></div>
            </div>
            <div style="display: flex; gap: 10px; margin-top: 10px;">
                <button class="btn btn-secondary btn-small" onclick="updateProgress('${goal.id}', 10)">+10%</button>
                <button class="btn btn-secondary btn-small" onclick="deleteGoal('${goal.id}')">Delete</button>
            </div>
        </div>
    `).join('');

    document.getElementById('goalsGrid').innerHTML = html;
}

function openAddGoalModal() {
    document.getElementById('goalModal').classList.add('active');
}

function closeAddGoalModal() {
    document.getElementById('goalModal').classList.remove('active');
    document.getElementById('goalTitle').value = '';
    document.getElementById('goalNotes').value = '';
}

async function addGoal() {
    const title = document.getElementById('goalTitle').value.trim();
    const category = document.getElementById('goalCategory').value;
    const notes = document.getElementById('goalNotes').value.trim();

    if (!title) {
        alert('Please enter a goal title');
        return;
    }

    try {
        await addDoc(collection(window.db, 'goals'), {
            userId: window.currentUser.uid,
            title,
            category,
            notes,
            progress: 0,
            completed: false,
            createdAt: new Date()
        });
        closeAddGoalModal();
    } catch (error) {
        console.error('Error adding goal:', error);
        alert('Failed to add goal');
    }
}

async function toggleGoal(id) {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;

    try {
        await updateDoc(doc(window.db, 'goals', id), {
            completed: !goal.completed,
            progress: !goal.completed ? 100 : goal.progress
        });
    } catch (error) {
        console.error('Error updating goal:', error);
    }
}

async function updateProgress(id, amount) {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;

    try {
        await updateDoc(doc(window.db, 'goals', id), {
            progress: Math.min(100, goal.progress + amount)
        });
    } catch (error) {
        console.error('Error updating progress:', error);
    }
}

async function deleteGoal(id) {
    if (!confirm('Delete this goal?')) return;

    try {
        await deleteDoc(doc(window.db, 'goals', id));
    } catch (error) {
        console.error('Error deleting goal:', error);
    }
}

// Focus Timer
function startFocus() {
    if (isRunning) return;

    focusTime = parseInt(document.getElementById('focusMinutes').value) * 60;
    isRunning = true;

    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('pauseBtn').style.display = 'flex';

    timerInterval = setInterval(() => {
        if (focusTime > 0) {
            focusTime--;
            updateTimerDisplay();
        } else {
            clearInterval(timerInterval);
            isRunning = false;
            alert('🎉 Focus session complete!');
            resetFocus();
        }
    }, 1000);
}

function pauseFocus() {
    clearInterval(timerInterval);
    isRunning = false;
    document.getElementById('startBtn').style.display = 'flex';
    document.getElementById('pauseBtn').style.display = 'none';
}

function resetFocus() {
    clearInterval(timerInterval);
    isRunning = false;
    focusTime = parseInt(document.getElementById('focusMinutes').value) * 60;
    updateTimerDisplay();
    document.getElementById('startBtn').style.display = 'flex';
    document.getElementById('pauseBtn').style.display = 'none';
}

function updateTimerDisplay() {
    const minutes = Math.floor(focusTime / 60);
    const seconds = focusTime % 60;
    document.getElementById('timerDisplay').textContent = 
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ============================================
// EXPORT TO WINDOW
// ============================================

window.toggleAuthForms = toggleAuthForms;
window.handleSignup = handleSignup;
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.togglePasswordVisibility = togglePasswordVisibility;
window.validateSignupPassword = validateSignupPassword;
window.validatePasswordMatch = validatePasswordMatch;
window.filterCategory = filterCategory;
window.previousMonth = previousMonth;
window.nextMonth = nextMonth;
window.openAddGoalModal = openAddGoalModal;
window.closeAddGoalModal = closeAddGoalModal;
window.addGoal = addGoal;
window.toggleGoal = toggleGoal;
window.updateProgress = updateProgress;
window.deleteGoal = deleteGoal;
window.startFocus = startFocus;
window.pauseFocus = pauseFocus;
window.resetFocus = resetFocus;
window.init = init;