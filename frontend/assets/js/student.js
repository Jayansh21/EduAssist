// Student Dashboard JavaScript - Professional Version

// API Base URL
const API_BASE = 'http://localhost:8000/api';

// Authentication check
function checkAuthentication() {
    const user = localStorage.getItem('user');
    if (!user) {
        window.location.href = 'login.html';
        return null;
    }
    const userObj = JSON.parse(user);
    if (userObj.role !== 'student') {
        window.location.href = 'login.html';
        return null;
    }
    return userObj;
}

// Logout function
function logout() {
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    const user = checkAuthentication();
    if (user) {
        initializeDashboard();
    }
});

async function initializeDashboard() {
    try {
        await Promise.all([
            loadStats(),
            loadRecentContent(), 
            loadRecentQuizzes(),
            setCurrentDate(),
            generateStudyPlan()
        ]);
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showNotification('Error loading dashboard data', 'error');
    }
}

async function loadStats() {
    try {
        // Get uploaded files count
        const uploadedResponse = await fetch(`${API_BASE}/uploaded-files`);
        const uploadedData = await uploadedResponse.json();
        const uploadedCount = uploadedData.files ? uploadedData.files.length : 0;
        
        // Get processed content count
        const processedResponse = await fetch(`${API_BASE}/processed-content`);
        const processedData = await processedResponse.json();
        const processedCount = processedData.content ? processedData.content.length : 0;
        
        // Get quizzes count
        const quizzesResponse = await fetch(`${API_BASE}/quizzes`);
        const quizzesData = await quizzesResponse.json();
        const quizCount = quizzesData.quizzes ? quizzesData.quizzes.length : 0;
        
        // Calculate average score (mock for now)
        const avgScore = calculateAverageScore();
        
        // Update stats display with animation
        animateCounter('uploaded-count', uploadedCount);
        animateCounter('processed-count', processedCount);
        animateCounter('quiz-count', quizCount);
        animateCounter('avg-score', avgScore, '%');
        
    } catch (error) {
        console.error('Error loading stats:', error);
        // Set default values on error
        document.getElementById('uploaded-count').textContent = '0';
        document.getElementById('processed-count').textContent = '0';
        document.getElementById('quiz-count').textContent = '0';
        document.getElementById('avg-score').textContent = '0%';
    }
}

function animateCounter(elementId, targetValue, suffix = '') {
    const element = document.getElementById(elementId);
    const startValue = 0;
    const duration = 1000;
    const startTime = performance.now();
    
    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOut);
        
        element.textContent = currentValue + suffix;
        
        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        }
    }
    
    requestAnimationFrame(updateCounter);
}

async function loadRecentContent() {
    try {
        const response = await fetch(`${API_BASE}/processed-content`);
        const data = await response.json();
        
        const container = document.getElementById('recent-content');
        
        if (data.content && data.content.length > 0) {
            const recentContent = data.content.slice(0, 3); // Show only 3 most recent
            
            container.innerHTML = recentContent.map(content => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 1rem; background-color: var(--neutral-50); border-radius: var(--radius-lg); border: 1px solid var(--neutral-200);">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div style="width: 40px; height: 40px; background-color: var(--primary-100); color: var(--primary-600); border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; font-size: 1.25rem;"><i class="fas fa-file"></i></div>
                        <div>
                            <h4 style="margin: 0; font-size: 0.875rem; font-weight: 600; color: var(--neutral-800);">${content.name}</h4>
                            <p style="margin: 0; font-size: 0.75rem; color: var(--neutral-500);">Processed • ${formatDate(content.processedDate)}</p>
                        </div>
                    </div>
                    <button class="btn btn-sm btn-outline" onclick="viewContent('${content.path}')">View</button>
                </div>
            `).join('');
        } else {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--neutral-400);">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;"><i class="fas fa-file-alt"></i></div>
                    <h4 style="margin: 0; font-size: 0.875rem; color: var(--neutral-600);">No content processed yet</h4>
                    <p style="margin: 0; font-size: 0.75rem; color: var(--neutral-500);">Upload some educational materials to get started</p>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Error loading recent content:', error);
        document.getElementById('recent-content').innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--error-500);">Error loading content</div>
        `;
    }
}

async function loadRecentQuizzes() {
    try {
        const response = await fetch(`${API_BASE}/quizzes`);
        const data = await response.json();
        
        const container = document.getElementById('recent-quizzes');
        
        if (data.quizzes && data.quizzes.length > 0) {
            const recentQuizzes = data.quizzes.slice(0, 3); // Show only 3 most recent
            
            container.innerHTML = recentQuizzes.map(quiz => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 1rem; background-color: var(--neutral-50); border-radius: var(--radius-lg); border: 1px solid var(--neutral-200);">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div style="width: 40px; height: 40px; background-color: var(--primary-100); color: var(--primary-600); border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; font-size: 1.25rem;"><i class="fas fa-brain"></i></div>
                        <div>
                            <h4 style="margin: 0; font-size: 0.875rem; font-weight: 600; color: var(--neutral-800);">${quiz.title}</h4>
                            <p style="margin: 0; font-size: 0.75rem; color: var(--neutral-500);">${quiz.totalQuestions} questions • ${formatDate(quiz.createdDate)}</p>
                        </div>
                    </div>
                    <button class="btn btn-sm btn-primary" onclick="takeQuiz('${quiz.id}')">Take Quiz</button>
                </div>
            `).join('');
        } else {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--neutral-400);">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">🎯</div>
                    <h4 style="margin: 0; font-size: 0.875rem; color: var(--neutral-600);">No quizzes available</h4>
                    <p style="margin: 0; font-size: 0.75rem; color: var(--neutral-500);">Process some content to generate quizzes</p>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Error loading recent quizzes:', error);
        document.getElementById('recent-quizzes').innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--error-500);">Error loading quizzes</div>
        `;
    }
}

function calculateAverageScore() {
    // This would calculate actual average from quiz results
    // For now, return a mock score
    const scores = JSON.parse(localStorage.getItem('quiz_scores') || '[]');
    if (scores.length === 0) return 0;
    
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return Math.round(average);
}

function setCurrentDate() {
    const today = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    document.getElementById('current-date').textContent = today.toLocaleDateString('en-US', options);
}

function generateStudyPlan() {
    const scheduleContainer = document.getElementById('study-schedule');
    const currentHour = new Date().getHours();
    
    // Generate a smart study plan based on available content
    const studyTasks = [
        { time: '09:00', task: 'Review uploaded materials and summaries', icon: '<i class="fas fa-book"></i>' },
        { time: '10:30', task: 'Take practice quiz on recent content', icon: '<i class="fas fa-brain"></i>' },
        { time: '14:00', task: 'Ask AI tutor about difficult concepts', icon: '<i class="fas fa-robot"></i>' },
        { time: '16:00', task: 'Create flashcards from key points', icon: '<i class="fas fa-layer-group"></i>' },
        { time: '19:00', task: 'Review quiz results and explanations', icon: '<i class="fas fa-chart-bar"></i>' }
    ];
    
    // Filter tasks for remaining hours of the day
    const remainingTasks = studyTasks.filter(task => {
        const taskHour = parseInt(task.time.split(':')[0]);
        return taskHour > currentHour;
    });
    
    if (remainingTasks.length > 0) {
        scheduleContainer.innerHTML = remainingTasks.map(task => `
            <div style="display: flex; align-items: center; padding: 1rem; background-color: var(--neutral-50); border-radius: var(--radius-lg); border-left: 4px solid var(--primary-500); margin-bottom: 0.75rem;">
                <div style="width: 40px; height: 40px; background-color: var(--primary-100); color: var(--primary-600); border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; font-size: 1.25rem; margin-right: 1rem;">${task.icon}</div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: var(--neutral-800); font-size: 0.875rem;">${task.time}</div>
                    <div style="color: var(--neutral-600); font-size: 0.875rem;">${task.task}</div>
                </div>
            </div>
        `).join('');
    } else {
        scheduleContainer.innerHTML = `
            <div style="display: flex; align-items: center; padding: 2rem; background-color: var(--success-50); border-radius: var(--radius-lg); border-left: 4px solid var(--success-500); text-align: center;">
                <div style="width: 40px; height: 40px; background-color: var(--success-100); color: var(--success-600); border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; font-size: 1.25rem; margin-right: 1rem;"><i class="fas fa-check-circle"></i></div>
                <div>
                    <div style="font-weight: 600; color: var(--success-800); font-size: 0.875rem;">Great job!</div>
                    <div style="color: var(--success-700); font-size: 0.875rem;">You've completed today's study plan. Consider reviewing your progress or starting tomorrow's preparation.</div>
                </div>
            </div>
        `;
    }
}

async function createRandomQuiz() {
    try {
        // Get available content
        const response = await fetch(`${API_BASE}/processed-content`);
        const data = await response.json();
        
        if (!data.content || data.content.length === 0) {
            showNotification('No processed content available for quiz generation', 'warning');
            return;
        }
        
        // Select random content
        const randomContent = data.content[Math.floor(Math.random() * data.content.length)];
        
        // Generate quiz
        const quizRequest = {
            contentPath: randomContent.path,
            questionTypes: ['multiple_choice', 'true_false'],
            questionCount: 5
        };
        
        showNotification('Generating random quiz...', 'info');
        
        const quizResponse = await fetch(`${API_BASE}/quiz/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(quizRequest)
        });
        
        const quiz = await quizResponse.json();
        
        if (quiz.id) {
            showNotification('Quiz generated successfully!', 'success');
            // Redirect to quiz page
            window.location.href = `quiz.html?quiz=${quiz.id}`;
        } else {
            throw new Error('Failed to generate quiz');
        }
        
    } catch (error) {
        console.error('Error creating random quiz:', error);
        showNotification('Error generating quiz', 'error');
    }
}


function viewContent(contentPath) {
    // This would open the content viewer modal
    // For now, redirect to main page
    window.location.href = `index.html?view=${encodeURIComponent(contentPath)}`;
}

function takeQuiz(quizId) {
    // Redirect to quiz page with specific quiz
    window.location.href = `quiz.html?quiz=${quizId}`;
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown date';
    
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            return 'Today';
        } else if (diffDays === 2) {
            return 'Yesterday';
        } else if (diffDays <= 7) {
            return `${diffDays - 1} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    } catch (error) {
        return 'Recently';
    }
}

// Enhanced notification function
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    
    // Set content and styling
    const icons = {
        success: '<i class="fas fa-check-circle"></i>',
        error: '<i class="fas fa-times-circle"></i>',
        warning: '<i class="fas fa-exclamation-triangle"></i>',
        info: '<i class="fas fa-info-circle"></i>'
    };
    
    const colors = {
        success: 'var(--success-500)',
        error: 'var(--error-500)',
        warning: 'var(--warning-500)',
        info: 'var(--primary-500)'
    };
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span style="font-size: 1.25rem;">${icons[type] || icons.info}</span>
            <span style="font-weight: 500;">${message}</span>
        </div>
    `;
    
    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 2rem;
        right: 2rem;
        background: white;
        border: 1px solid ${colors[type] || colors.info};
        border-radius: var(--radius-lg);
        padding: 1rem 1.5rem;
        box-shadow: var(--shadow-lg);
        z-index: 1000;
        max-width: 400px;
        transform: translateX(100%);
        transition: all 0.3s ease;
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 4 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('study-tips-modal');
    if (event.target === modal) {
        closeStudyTips();
    }
}