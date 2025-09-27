// EduAssist - Main Upload Functionality

// Authentication check
function checkAuthentication() {
    const user = localStorage.getItem('user');
    if (!user) {
        window.location.href = 'login.html';
        return null;
    }
    return JSON.parse(user);
}

// Logout function
function logout() {
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Check authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    const user = checkAuthentication();
    if (user) {
        // Add user info to header if needed
        console.log('User logged in:', user);
        // Initialize upload functionality only if user is authenticated
        initializeUploadFunctionality();
    }
});

function initializeUploadFunctionality() {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    const uploadForm = document.getElementById('upload-form');
    const uploadBtn = document.getElementById('upload-btn');
    const fileList = document.getElementById('uploaded-files-list');
    
    if (!dropzone || !fileInput || !uploadForm || !uploadBtn || !fileList) {
        console.error('Upload elements not found!');
        return;
    }

    let uploadQueue = [];

    // Drag and drop events
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, handleDragOver);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, handleDragLeave);
    });

    dropzone.addEventListener('drop', handleDrop);
    dropzone.addEventListener('click', (e) => {
        // Allow clicking anywhere in the dropzone to open file picker
        fileInput.click();
    });

    fileInput.addEventListener('change', handleFileSelect);
    uploadForm.addEventListener('submit', handleFormSubmit);

    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('dragover');
    }

    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
    }

    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFiles(files);
        }
    }

    function handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            handleFiles(files);
            // Don't clear immediately - let the upload process handle it
        }
    }

    function handleFiles(files) {
        for (const file of files) {
            const fileInfo = {
                file: file,
                id: generateId(),
                name: file.name,
                size: file.size,
                type: file.type,
                status: 'pending'
            };
            
            uploadQueue.push(fileInfo);
            addFileToList(fileInfo);
        }
        
        updateUploadButton();
    }

    function addFileToList(fileInfo) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.id = `file-${fileInfo.id}`;
        
        fileItem.innerHTML = `
            <div class="file-info">
                <div class="file-name">${fileInfo.name}</div>
                <div class="file-meta">${formatFileSize(fileInfo.size)} • ${getFileType(fileInfo.type)}</div>
                <div class="progress">
                    <span style="width: 0%"></span>
                </div>
            </div>
            <div class="status">Pending</div>
        `;
        
        fileList.appendChild(fileItem);
    }

    function updateFileStatus(fileId, status, progress = 0) {
        const fileItem = document.getElementById(`file-${fileId}`);
        if (!fileItem) return;
        
        const statusEl = fileItem.querySelector('.status');
        const progressBar = fileItem.querySelector('.progress span');
        
        statusEl.textContent = status;
        progressBar.style.width = `${progress}%`;
        
        if (status === 'Completed') {
            statusEl.classList.add('success');
        } else if (status === 'Failed') {
            statusEl.classList.add('error');
        }
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        
        if (uploadQueue.length === 0) {
            showMessage('Please select files to upload', 'error');
            return;
        }
        
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<span class="spinner"></span>Uploading...';
        
        try {
            const formData = new FormData();
            uploadQueue.forEach(fileInfo => {
                formData.append('files', fileInfo.file);
            });
            
            const response = await fetch('http://localhost:8000/api/upload', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                showMessage(`Successfully uploaded ${result.count} files!`, 'success');
                
                // Update file statuses
                result.files.forEach((file, index) => {
                    const fileInfo = uploadQueue[index];
                    if (fileInfo) {
                        updateFileStatus(fileInfo.id, file.processed ? 'Completed' : 'Failed');
                    }
                });
                
                uploadQueue = [];
                // Clear the file input
                fileInput.value = '';
                // Refresh both uploaded files and processed content
                loadUploadedFiles();
                loadProcessedContent();
                setTimeout(() => {
                    fileList.innerHTML = '<div class="empty-state"><div class="empty-icon">📄</div><p>No files uploaded yet</p><small>Upload your first file to get started</small></div>';
                }, 3000);
            } else {
                showMessage('Upload failed. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Upload error:', error);
            showMessage('Upload failed. Please try again.', 'error');
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<span class="btn-icon">📤</span>Upload Files';
        }
    }

    function updateUploadButton() {
        uploadBtn.disabled = uploadQueue.length === 0;
    }

    function generateId() {
        return 'file-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function getFileType(mimeType) {
        if (mimeType.startsWith('video/')) return 'Video';
        if (mimeType.startsWith('audio/')) return 'Audio';
        if (mimeType === 'application/pdf') return 'PDF';
        return 'File';
    }

    window.showMessage = function(message, type) {
        const messageEl = document.createElement('div');
        messageEl.className = `${type}-message`;
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 2rem;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        
        if (type === 'success') {
            messageEl.style.background = '#10b981';
        } else {
            messageEl.style.background = '#ef4444';
        }
        
        document.body.appendChild(messageEl);
        
        setTimeout(() => {
            messageEl.remove();
        }, 3000);
    }

    // Load processed content
    async function loadProcessedContent() {
        try {
            const response = await fetch('http://localhost:8000/api/processed-content');
            const data = await response.json();
            const content = data.content || [];
            
            const contentList = document.getElementById('processed-content-list');
            
            if (content.length === 0) {
                contentList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📝</div>
                        <p>No processed content yet</p>
                        <small>Upload and process files to see content here</small>
                    </div>
                `;
                return;
            }
            
            contentList.innerHTML = content.map(item => `
                <div class="content-item">
                    <div class="content-info">
                        <h4>${item.name}</h4>
                        <p>${(item.size / 1024).toFixed(1)} KB • ${item.type} • ${new Date(item.processedDate || Date.now()).toLocaleDateString()}</p>
                    </div>
                    <div class="content-actions">
                        <button class="btn-view" onclick="viewContent('${item.path}', '${item.name}')">👁️ View</button>
                        <button class="btn-delete" onclick="deleteProcessedContent('${item.path}')">🗑️ Delete</button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading processed content:', error);
        }
    }

    // Delete processed content
    async function deleteProcessedContent(contentPath) {
        // Show immediate feedback
        showNotification('Deleting content...', 'info');
        
        try {
            const response = await fetch(`http://localhost:8000/api/processed-content/${encodeURIComponent(contentPath)}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                showNotification('Content deleted successfully', 'success');
                loadProcessedContent();
                loadUploadedFiles(); // Also refresh uploaded files in case of related files
            } else {
                const error = await response.json();
                showNotification(`Error: ${error.error}`, 'error');
            }
        } catch (error) {
            console.error('Error deleting content:', error);
            showNotification('Error deleting content', 'error');
        }
    }

    // Refresh buttons
    document.getElementById('refresh-uploaded')?.addEventListener('click', loadUploadedFiles);
    document.getElementById('refresh-processed')?.addEventListener('click', loadProcessedContent);

    // Load uploaded files
    async function loadUploadedFiles() {
        try {
            const response = await fetch('http://localhost:8000/api/uploaded-files');
            const data = await response.json();
            const files = data.files || [];
            
            const fileList = document.getElementById('uploaded-files-list');
            
            if (files.length === 0) {
                fileList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📄</div>
                        <p>No files uploaded yet</p>
                        <small>Upload your first file to get started</small>
                    </div>
                `;
                return;
            }
            
            fileList.innerHTML = files.map(file => `
                <div class="content-item">
                    <div class="content-info">
                        <h4>${file.name}</h4>
                        <p>${(file.size / 1024 / 1024).toFixed(2)} MB • ${file.type} • ${new Date(file.uploadDate || Date.now()).toLocaleDateString()}</p>
                    </div>
                    <div class="content-actions">
                        <button class="btn-delete" onclick="deleteUploadedFile('${file.path}')">🗑️ Delete</button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading uploaded files:', error);
            const fileList = document.getElementById('uploaded-files-list');
            fileList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📄</div>
                    <p>No files uploaded yet</p>
                    <small>Upload your first file to get started</small>
                </div>
            `;
        }
    }

    // Delete uploaded file
    async function deleteUploadedFile(filePath) {
        // Show immediate feedback
        showNotification('Deleting file...', 'info');
        
        try {
            const response = await fetch(`http://localhost:8000/api/uploaded-files/${encodeURIComponent(filePath)}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                showNotification('File deleted successfully', 'success');
                loadUploadedFiles();
                loadProcessedContent(); // Also refresh processed content in case of related files
            } else {
                const error = await response.json();
                showNotification(`Error: ${error.error}`, 'error');
            }
        } catch (error) {
            console.error('Error deleting file:', error);
            showNotification('Error deleting file', 'error');
        }
    }

    // View content modal
    async function viewContent(contentPath, contentName) {
        try {
            // Show modal
            const modal = document.getElementById('content-modal');
            const modalTitle = document.getElementById('modal-title');
            modalTitle.textContent = contentName;
            modal.style.display = 'block';

            // Load content data
            const response = await fetch(`http://localhost:8000/api/processed-content/${encodeURIComponent(contentPath)}`);
            const contentData = await response.json();
            
            if (contentData.error) {
                showNotification('Error loading content: ' + contentData.error, 'error');
                return;
            }
            
            // Display transcript
            const transcriptContent = document.querySelector('#transcript-content .content-text');
            transcriptContent.textContent = contentData.transcript || 'No transcript available';
            
            // Display summary (remove markdown formatting)
            const summaryContent = document.querySelector('#summary-content .content-text');
            const cleanSummary = (contentData.summary || 'No summary available')
                .replace(/#{1,6}\s+/g, '') // Remove markdown headers
                .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
                .replace(/\*(.*?)\*/g, '$1') // Remove italic formatting
                .replace(/`(.*?)`/g, '$1') // Remove code formatting
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Remove markdown links
            summaryContent.textContent = cleanSummary;

            // Setup tab switching
            setupContentTabs();
        } catch (error) {
            console.error('Error loading content:', error);
            showNotification('Error loading content', 'error');
        }
    }

    // Switch tab function
    window.switchTab = function(tabName) {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        // Remove active from all tabs
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.style.display = 'none');
        
        // Add active to selected tab
        document.querySelector(`[onclick="switchTab('${tabName}')"]`).classList.add('active');
        document.getElementById(`${tabName}-content`).style.display = 'block';
    };

    // Setup content tabs
    function setupContentTabs() {
        // Tabs are handled by onclick events, no additional setup needed
    }

    // Close modal
    window.closeModal = function() {
        const modal = document.getElementById('content-modal');
        modal.style.display = 'none';
    };

    // Show notification
    window.showNotification = function(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        if (type === 'success') {
            notification.style.backgroundColor = '#10b981';
        } else if (type === 'error') {
            notification.style.backgroundColor = '#ef4444';
        } else if (type === 'info') {
            notification.style.backgroundColor = '#3b82f6';
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Make functions globally available
    window.deleteProcessedContent = deleteProcessedContent;
    window.deleteUploadedFile = deleteUploadedFile;
    window.viewContent = viewContent;

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
        console.log('EduAssist Upload initialized');
        loadUploadedFiles();
        loadProcessedContent();
        
        // Setup refresh buttons
        document.getElementById('refresh-processed')?.addEventListener('click', loadProcessedContent);
        document.getElementById('refresh-uploaded')?.addEventListener('click', loadUploadedFiles);
        
        // Setup modal close
        document.getElementById('close-modal')?.addEventListener('click', closeModal);
        document.getElementById('content-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'content-modal') {
                closeModal();
            }
        });
    });
}
