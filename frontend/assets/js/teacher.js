// Teacher Dashboard JavaScript

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
    if (userObj.role !== 'teacher') {
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

// Get teacher ID from authenticated user
function getTeacherId() {
    const user = checkAuthentication();
    return user ? user.email.replace('@demo.com', '_1') : 'teacher_1';
}

// Current assignment being worked on
let currentAssignment = null;

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    const user = checkAuthentication();
    if (user) {
        initializeTeacherDashboard();
        setupFormHandlers();
    }
});

async function initializeTeacherDashboard() {
    try {
        await Promise.all([
            loadTeacherStats(),
            loadTeacherAssignments()
        ]);
    } catch (error) {
        console.error('Error initializing teacher dashboard:', error);
        showNotification('Error loading dashboard data', 'error');
    }
}

async function loadTeacherStats() {
    try {
        const teacherId = getTeacherId();
        // Get assignments count
        const assignmentsResponse = await fetch(`${API_BASE}/teacher/assignments/${teacherId}`);
        const assignmentsData = await assignmentsResponse.json();
        const assignmentsCount = assignmentsData.assignments ? assignmentsData.assignments.length : 0;
        
        // Get class analytics
        const analyticsResponse = await fetch(`${API_BASE}/teacher/class-analytics/class_1`);
        const analytics = await analyticsResponse.json();
        
        // Update stats with animation
        animateCounter('total-assignments', assignmentsCount);
        animateCounter('total-students', analytics.totalStudents || 25);
        document.getElementById('avg-class-score').textContent = (analytics.averageScore || 78.5) + '%';
        document.getElementById('completion-rate').textContent = '92%'; // Mock data
        
    } catch (error) {
        console.error('Error loading teacher stats:', error);
        // Set default values on error
        document.getElementById('total-assignments').textContent = '0';
        document.getElementById('total-students').textContent = '25';
        document.getElementById('avg-class-score').textContent = '78.5%';
        document.getElementById('completion-rate').textContent = '92%';
    }
}

async function loadTeacherAssignments() {
    try {
        const teacherId = getTeacherId();
        const response = await fetch(`${API_BASE}/teacher/assignments/${teacherId}`);
        const data = await response.json();
        
        const container = document.getElementById('assignments-list');
        
        if (data.assignments && data.assignments.length > 0) {
            container.innerHTML = data.assignments.map(assignment => `
                <div style="padding: 1rem; border: 1px solid var(--neutral-200); border-radius: var(--radius-lg); margin-bottom: 0.75rem; background: white;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                        <h4 style="margin: 0; font-size: 0.875rem; font-weight: 600; color: var(--neutral-800);">${assignment.title}</h4>
                        <span style="font-size: 0.75rem; color: var(--primary-600); background: var(--primary-100); padding: 0.25rem 0.5rem; border-radius: var(--radius-sm);">${assignment.difficulty}</span>
                    </div>
                    <p style="margin: 0 0 0.75rem 0; font-size: 0.75rem; color: var(--neutral-500);">${assignment.totalQuestions} questions • ${formatDate(assignment.createdAt)}</p>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-sm btn-outline" onclick="viewAssignment('${assignment.id}')">View</button>
                        <button class="btn btn-sm btn-primary" onclick="shareAssignment('${assignment.id}')">Share</button>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--neutral-400);">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;"><i class="fas fa-file-alt"></i></div>
                    <h4 style="margin: 0; font-size: 0.875rem; color: var(--neutral-600);">No assignments created yet</h4>
                    <p style="margin: 0; font-size: 0.75rem; color: var(--neutral-500);">Create your first assignment to get started</p>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Error loading assignments:', error);
        document.getElementById('assignments-list').innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--error-500);">Error loading assignments</div>
        `;
    }
}

function setupFormHandlers() {
    // Assignment form handler
    document.getElementById('assignment-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        await generateAssignment();
    });
}

// Navigation functions
function showSection(sectionName) {
    // Hide all sections
    const sections = ['dashboard', 'assignments', 'analytics', 'tools'];
    sections.forEach(section => {
        document.getElementById(`${section}-section`).style.display = 'none';
    });
    
    // Show selected section
    document.getElementById(`${sectionName}-section`).style.display = 'block';
    
    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    event.target.classList.add('active');
}

function showCreateAssignment() {
    showSection('assignments');
}

function showGrading() {
    showSection('tools');
    // Scroll to grading section
    document.getElementById('grade-assignment-id').focus();
}

function showLessonPlanner() {
    showSection('tools');
    // Scroll to lesson planner
    document.getElementById('lesson-topic').focus();
}

// Assignment generation
async function generateAssignment() {
    try {
        const syllabusText = document.getElementById('syllabus-text').value;
        const difficulty = document.getElementById('difficulty-level').value;
        const questionCount = parseInt(document.getElementById('question-count').value);
        
        if (!syllabusText.trim()) {
            showNotification('Please enter syllabus content', 'warning');
            return;
        }
        
        // Get selected question types
        const questionTypes = [];
        if (document.getElementById('mcq-type').checked) questionTypes.push('multiple_choice');
        if (document.getElementById('short-type').checked) questionTypes.push('short_answer');
        if (document.getElementById('long-type').checked) questionTypes.push('long_answer');
        if (document.getElementById('tf-type').checked) questionTypes.push('true_false');
        
        if (questionTypes.length === 0) {
            showNotification('Please select at least one question type', 'warning');
            return;
        }
        
        showNotification('Generating assignment...', 'info');
        
        const response = await fetch(`${API_BASE}/teacher/generate-assignment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                teacherId: getTeacherId(),
                syllabusText: syllabusText,
                difficulty: difficulty,
                questionTypes: questionTypes,
                questionCount: questionCount
            })
        });
        
        const assignment = await response.json();
        
        if (assignment.id) {
            currentAssignment = assignment;
            showAssignmentPreview(assignment);
            showNotification('Assignment generated successfully!', 'success');
        } else {
            throw new Error('Failed to generate assignment');
        }
        
    } catch (error) {
        console.error('Error generating assignment:', error);
        showNotification('Error generating assignment', 'error');
    }
}

function showAssignmentPreview(assignment) {
    const preview = document.getElementById('assignment-preview');
    
    let questionsHtml = assignment.questions.map((question, index) => {
        let questionContent = `
            <div style="padding: 1.5rem; border: 1px solid var(--neutral-200); border-radius: var(--radius-lg); margin-bottom: 1rem; background: white;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h4 style="margin: 0; color: var(--primary-600);">Question ${index + 1}</h4>
                    <span style="font-size: 0.75rem; background: var(--neutral-100); padding: 0.25rem 0.5rem; border-radius: var(--radius-sm);">${question.marks} marks</span>
                </div>
                <p style="margin-bottom: 1rem; font-weight: 500;">${question.question}</p>
        `;
        
        if (question.type === 'multiple_choice') {
            questionContent += `
                <div style="margin-bottom: 1rem;">
                    ${question.options.map((option, i) => `
                        <div style="margin-bottom: 0.5rem; padding: 0.5rem; background: ${option === question.correctAnswer ? 'var(--success-50)' : 'var(--neutral-50)'}; border-radius: var(--radius-base);">
                            ${String.fromCharCode(65 + i)}. ${option} ${option === question.correctAnswer ? '✓' : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (question.type === 'true_false') {
            questionContent += `
                <div style="margin-bottom: 1rem;">
                    <div style="padding: 0.5rem; background: ${question.correctAnswer ? 'var(--success-50)' : 'var(--neutral-50)'}; border-radius: var(--radius-base); margin-bottom: 0.5rem;">
                        True ${question.correctAnswer === true ? '✓' : ''}
                    </div>
                    <div style="padding: 0.5rem; background: ${!question.correctAnswer ? 'var(--success-50)' : 'var(--neutral-50)'}; border-radius: var(--radius-base);">
                        False ${question.correctAnswer === false ? '✓' : ''}
                    </div>
                </div>
            `;
        } else {
            questionContent += `
                <div style="margin-bottom: 1rem; padding: 1rem; background: var(--neutral-50); border-radius: var(--radius-base);">
                    <strong>Sample Answer:</strong>
                    <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem;">${question.correctAnswer}</p>
                </div>
            `;
        }
        
        questionContent += `
                <div style="font-size: 0.75rem; color: var(--neutral-500);">
                    <strong>Marking Scheme:</strong> ${question.markingScheme}
                </div>
            </div>
        `;
        
        return questionContent;
    }).join('');
    
    preview.innerHTML = `
        <div style="margin-bottom: 1.5rem;">
            <h3 style="margin: 0 0 0.5rem 0; color: var(--neutral-800);">${assignment.title}</h3>
            <p style="margin: 0; color: var(--neutral-600);">Difficulty: ${assignment.difficulty} | Questions: ${assignment.totalQuestions}</p>
        </div>
        ${questionsHtml}
    `;
    
    document.getElementById('assignment-modal').style.display = 'flex';
}

function closeAssignmentModal() {
    document.getElementById('assignment-modal').style.display = 'none';
}

function saveAssignment() {
    if (currentAssignment) {
        showNotification('Assignment saved successfully!', 'success');
        closeAssignmentModal();
        loadTeacherAssignments(); // Refresh the assignments list
        
        // Clear the form
        document.getElementById('assignment-form').reset();
    }
}

// Grading functions
async function gradeSubmission() {
    try {
        const assignmentId = document.getElementById('grade-assignment-id').value;
        const answersText = document.getElementById('student-answers').value;
        
        if (!assignmentId || !answersText) {
            showNotification('Please fill in all fields', 'warning');
            return;
        }
        
        let answers;
        try {
            answers = JSON.parse(answersText);
        } catch (e) {
            showNotification('Invalid JSON format for answers', 'error');
            return;
        }
        
        showNotification('Grading submission...', 'info');
        
        const response = await fetch(`${API_BASE}/teacher/grade`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                teacherId: getTeacherId(),
                assignmentId: assignmentId,
                answers: answers,
                studentId: 'student_1'
            })
        });
        
        const result = await response.json();
        
        if (result.id) {
            displayGradingResult(result);
            showNotification('Grading completed successfully!', 'success');
        } else {
            throw new Error('Grading failed');
        }
        
    } catch (error) {
        console.error('Error grading submission:', error);
        showNotification('Error grading submission', 'error');
    }
}

function displayGradingResult(result) {
    const container = document.getElementById('grading-result');
    
    const resultHtml = `
        <div style="border: 1px solid var(--neutral-200); border-radius: var(--radius-lg); padding: 1.5rem; background: white; margin-top: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h4 style="margin: 0; color: var(--primary-600);">Grading Result</h4>
                <span style="font-size: 1.25rem; font-weight: 700; color: var(--success-600);">${result.percentage}% (${result.letterGrade})</span>
            </div>
            
            <div style="margin-bottom: 1rem; padding: 1rem; background: var(--neutral-50); border-radius: var(--radius-base);">
                <strong>Overall Feedback:</strong>
                <p style="margin: 0.5rem 0 0 0;">${result.overallFeedback}</p>
            </div>
            
            <div style="margin-bottom: 1rem;">
                <strong>Score Breakdown:</strong>
                <div style="margin-top: 0.5rem; font-size: 0.875rem;">
                    ${result.earnedMarks} out of ${result.totalMarks} marks
                </div>
            </div>
            
            <div>
                <strong>Question Details:</strong>
                <div style="margin-top: 0.5rem;">
                    ${result.questionResults.slice(0, 3).map((q, i) => `
                        <div style="margin-bottom: 0.75rem; padding: 0.75rem; background: var(--neutral-50); border-radius: var(--radius-base); font-size: 0.875rem;">
                            <strong>Q${i + 1}:</strong> ${q.marksEarned}/${q.totalMarks} marks
                            <br><em>${q.feedback}</em>
                        </div>
                    `).join('')}
                    ${result.questionResults.length > 3 ? `<div style="text-align: center; color: var(--neutral-500); font-size: 0.875rem;">...and ${result.questionResults.length - 3} more questions</div>` : ''}
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = resultHtml;
}

// Plagiarism checking
async function checkPlagiarism() {
    try {
        const content = document.getElementById('plagiarism-text').value;
        
        if (!content.trim()) {
            showNotification('Please enter content to check', 'warning');
            return;
        }
        
        showNotification('Checking for plagiarism...', 'info');
        
        const response = await fetch(`${API_BASE}/teacher/check-plagiarism`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: content
            })
        });
        
        const result = await response.json();
        displayPlagiarismResult(result);
        
    } catch (error) {
        console.error('Error checking plagiarism:', error);
        showNotification('Error checking plagiarism', 'error');
    }
}

function displayPlagiarismResult(result) {
    const container = document.getElementById('plagiarism-result');
    
    const statusColor = result.originalityPercent >= 85 ? 'var(--success-500)' : 
                       result.originalityPercent >= 70 ? 'var(--warning-500)' : 'var(--error-500)';
    
    const resultHtml = `
        <div style="border: 1px solid var(--neutral-200); border-radius: var(--radius-lg); padding: 1.5rem; background: white;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h4 style="margin: 0; color: var(--primary-600);">Plagiarism Check Result</h4>
                <span style="font-size: 1.25rem; font-weight: 700; color: ${statusColor};">${result.originalityPercent}% Original</span>
            </div>
            
            <div style="margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span>Originality</span>
                    <span>${result.originalityPercent}%</span>
                </div>
                <div style="width: 100%; height: 8px; background: var(--neutral-200); border-radius: 4px;">
                    <div style="width: ${result.originalityPercent}%; height: 100%; background: ${statusColor}; border-radius: 4px;"></div>
                </div>
            </div>
            
            ${result.matches.length > 0 ? `
                <div>
                    <strong>Potential Matches:</strong>
                    <div style="margin-top: 0.5rem;">
                        ${result.matches.map(match => `
                            <div style="margin-bottom: 0.5rem; padding: 0.75rem; background: var(--warning-50); border-radius: var(--radius-base); font-size: 0.875rem;">
                                <strong>${match.source}</strong> (${match.similarity}% similarity)
                                ${match.url !== '#' ? `<br><a href="${match.url}" target="_blank" style="color: var(--primary-600);">View Source</a>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : '<div style="color: var(--success-600); font-weight: 500;">No potential plagiarism detected.</div>'}
        </div>
    `;
    
    container.innerHTML = resultHtml;
}

// Lesson plan generation
async function generateLessonPlan() {
    try {
        const topic = document.getElementById('lesson-topic').value;
        const classLevel = document.getElementById('lesson-level').value;
        const duration = parseInt(document.getElementById('lesson-duration').value);
        
        if (!topic.trim()) {
            showNotification('Please enter a topic', 'warning');
            return;
        }
        
        showNotification('Generating lesson plan...', 'info');
        
        const response = await fetch(`${API_BASE}/teacher/generate-lesson-plan`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                teacherId: getTeacherId(),
                topic: topic,
                classLevel: classLevel,
                duration: duration
            })
        });
        
        const lessonPlan = await response.json();
        displayLessonPlan(lessonPlan);
        showNotification('Lesson plan generated successfully!', 'success');
        
    } catch (error) {
        console.error('Error generating lesson plan:', error);
        showNotification('Error generating lesson plan', 'error');
    }
}

function displayLessonPlan(plan) {
    const container = document.getElementById('lesson-plan-result');
    
    const planHtml = `
        <div style="border: 1px solid var(--neutral-200); border-radius: var(--radius-lg); padding: 1.5rem; background: white; margin-top: 1rem;">
            <h4 style="margin: 0 0 1rem 0; color: var(--primary-600);">Lesson Plan: ${plan.topic}</h4>
            
            <div style="margin-bottom: 1.5rem;">
                <strong>Learning Objectives:</strong>
                <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
                    ${plan.objectives.map(obj => `<li style="margin-bottom: 0.25rem;">${obj}</li>`).join('')}
                </ul>
            </div>
            
            <div style="margin-bottom: 1.5rem;">
                <strong>Activities (${plan.duration} minutes):</strong>
                <div style="margin-top: 0.5rem;">
                    ${plan.activities.map(activity => `
                        <div style="margin-bottom: 1rem; padding: 1rem; background: var(--neutral-50); border-radius: var(--radius-base);">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                <strong>${activity.activity}</strong>
                                <span style="font-size: 0.875rem; color: var(--primary-600);">${activity.time}</span>
                            </div>
                            <p style="margin: 0; font-size: 0.875rem; color: var(--neutral-600);">${activity.description}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div>
                    <strong>Materials Needed:</strong>
                    <ul style="margin: 0.5rem 0; padding-left: 1.5rem; font-size: 0.875rem;">
                        ${plan.materials.map(material => `<li>${material}</li>`).join('')}
                    </ul>
                </div>
                <div>
                    <strong>Assessment:</strong>
                    <ul style="margin: 0.5rem 0; padding-left: 1.5rem; font-size: 0.875rem;">
                        ${plan.assessment.map(assess => `<li>${assess}</li>`).join('')}
                    </ul>
                </div>
            </div>
            
            <div style="margin-top: 1rem; padding: 1rem; background: var(--primary-50); border-radius: var(--radius-base);">
                <strong>Homework:</strong>
                <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem;">${plan.homework}</p>
            </div>
        </div>
    `;
    
    container.innerHTML = planHtml;
}

// Utility functions
function showRecommendations() {
    showNotification('Loading personalized recommendations...', 'info');
    
    setTimeout(() => {
        showNotification('Recommendations: Focus on Advanced Concepts with additional practice materials', 'success');
    }, 1500);
}

function viewAssignment(assignmentId) {
    showNotification(`Opening assignment ${assignmentId}...`, 'info');
}

function shareAssignment(assignmentId) {
    showNotification(`Assignment link copied to clipboard!`, 'success');
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

function formatDate(dateString) {
    if (!dateString) return 'Unknown date';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
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
