// list_scripts.js

document.addEventListener('DOMContentLoaded', function() {
    const recordsTableBody = document.getElementById('recordsTableBody');
    const filterSearchTermInput = document.getElementById('filterSearchTerm');
    const filterTypeSelect = document.getElementById('filterType');
    const applyFilterBtn = document.getElementById('applyFilterBtn');
    const clearFilterBtn = document.getElementById('clearFilterBtn');
    const logoutLink = document.getElementById('logoutLink');

    // Modal elements
    const approveModal = document.getElementById('approveModal');
    const modalStudentNameSpan = document.getElementById('modalStudentName');
    const modalStudentIdSpan = document.getElementById('modalStudentId');
    const payOptionBtn = document.getElementById('payOptionBtn');
    const communityServiceOptionBtn = document.getElementById('communityServiceOptionBtn');
    const cancelApproveBtn = document.getElementById('cancelApproveBtn');

    let currentRecordIdForApproval = null; // To store the ID of the record being approved

    // Check login status from localStorage
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

    // Add logout functionality
    if (logoutLink) {
        logoutLink.addEventListener('click', function(event) {
            event.preventDefault(); // Prevent default link behavior
            localStorage.removeItem('isLoggedIn'); // Clear login flag from localStorage
            alert('You have been logged out.');
            window.location.href = '../login/login.html'; // Redirect to login page
        });
    }

    // Function to show the approval modal
    function showApproveModal(recordId, studentName) {
        currentRecordIdForApproval = recordId;
        modalStudentNameSpan.textContent = studentName;
        modalStudentIdSpan.textContent = recordId;
        approveModal.classList.remove('hidden');
        approveModal.classList.add('show'); // For transition effect
    }

    // Function to hide the approval modal
    function hideApproveModal() {
        approveModal.classList.remove('show');
        // Use a timeout to allow transition to complete before hiding
        setTimeout(() => {
            approveModal.classList.add('hidden');
            currentRecordIdForApproval = null; // Clear the stored ID
        }, 300); // Match CSS transition duration
    }

    // Event listeners for modal buttons
    payOptionBtn.addEventListener('click', function() {
        if (currentRecordIdForApproval) {
            sendApprovalToServer(currentRecordIdForApproval, 'Pay');
        }
        hideApproveModal();
    });

    communityServiceOptionBtn.addEventListener('click', function() {
        if (currentRecordIdForApproval) {
            sendApprovalToServer(currentRecordIdForApproval, 'Community Service');
        }
        hideApproveModal();
    });

    cancelApproveBtn.addEventListener('click', function() {
        hideApproveModal();
    });

    // Close modal if clicking outside content (on overlay)
    approveModal.addEventListener('click', function(event) {
        if (event.target === approveModal) {
            hideApproveModal();
        }
    });


    // Function to fetch and display records
    function fetchAndDisplayRecords(filterType = '', searchTerm = '') {
        recordsTableBody.innerHTML = '<tr><td colspan="7">Loading records...</td></tr>';

        let url = '../homepage/get_records.php'; // Absolute path from server root

        const params = new URLSearchParams();
        if (searchTerm) {
            params.append('filterType', filterType);
            params.append('searchTerm', searchTerm);
        }

        if (params.toString()) {
            url += '?' + params.toString();
        }

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    console.error('HTTP error response:', response);
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                recordsTableBody.innerHTML = '';

                if (data.success && data.data.length > 0) {
                    data.data.forEach(record => {
                        const row = document.createElement('tr');
                        row.dataset.originalRecord = JSON.stringify(record);
                        // Add a direct data-record-id attribute for easier selection
                        row.dataset.recordId = record.id; // Ensure this matches the ID column

                        let actionsHtml = '';
                        if (isLoggedIn) {
                            actionsHtml = `
                                <button class="send-message-btn action-button green-button"
                                        data-email="${record.email}" data-name="${record.name}" data-id="${record.id}" data-level="${record.level}">Send Message</button>
                                <button class="delete-record-btn action-button red-button"
                                        data-id="${record.id}">Delete</button>
                                <button class="edit-record-btn action-button blue-button"
                                        data-id="${record.id}">Edit</button>
                                <button class="approve-record-btn action-button purple-button"
                                        data-id="${record.id}" data-name="${record.name}">Approve</button>
                                <span class="email-status" id="status-${record.id}"></span>
                            `;
                        } else {
                            actionsHtml = `<span>Login to manage</span>`;
                        }

                        // MODIFIED: Added data-field attributes to cells for editing
                        row.innerHTML = `
                            <td data-field="id">${record.id}</td>
                            <td data-field="name">${record.name}</td>
                            <td data-field="program">${record.program}</td>
                            <td data-field="set_year">${record.set_year}</td>
                            <td data-field="level">${record.level}</td>
                            <td data-field="email">${record.email}</td>
                            <td class="actions-cell">${actionsHtml}</td>
                        `;
                        recordsTableBody.appendChild(row);
                    });

                    // Attach event listeners ONLY if buttons were added (i.e., if logged in)
                    if (isLoggedIn) {
                        document.querySelectorAll('.send-message-btn').forEach(button => {
                            button.addEventListener('click', function() {
                                const recipientEmail = this.dataset.email;
                                const recipientName = this.dataset.name;
                                const recordId = this.dataset.id;
                                const sanctionLevel = this.dataset.level;

                                sendEmailToServer(recipientEmail, recipientName, recordId, sanctionLevel);
                            });
                        });

                        document.querySelectorAll('.delete-record-btn').forEach(button => {
                            button.addEventListener('click', function() {
                                const recordIdToDelete = this.dataset.id;
                                if (confirm(`Are you sure you want to delete record with ID: ${recordIdToDelete}?`)) {
                                    deleteRecord(recordIdToDelete);
                                }
                            });
                        });

                        document.querySelectorAll('.edit-record-btn').forEach(button => {
                            button.addEventListener('click', function() {
                                const recordIdToEdit = this.dataset.id;
                                enableEditMode(recordIdToEdit);
                            });
                        });

                        document.querySelectorAll('.approve-record-btn').forEach(button => {
                            button.addEventListener('click', function() {
                                const recordIdToApprove = this.dataset.id;
                                const studentName = this.dataset.name;
                                showApproveModal(recordIdToApprove, studentName);
                            });
                        });
                    }

                } else {
                    const row = document.createElement('tr');
                    row.innerHTML = `<td colspan="7" style="text-align: center;">No records found.</td>`;
                    recordsTableBody.appendChild(row);
                }
            })
            .catch(error => {
                console.error('Error fetching records:', error);
                recordsTableBody.innerHTML = `<tr><td colspan="7" style="color: red; text-align: center;">Failed to load records. Please try again later.</td></tr>`;
            });
    }

    // Function to enable edit mode for a specific row
    function enableEditMode(recordId) {
        // MODIFIED: Use data-record-id for selection
        const row = recordsTableBody.querySelector(`tr[data-record-id="${recordId}"]`);
        if (!row) {
            console.error("Error: Record row not found for ID", recordId);
            return;
        }

        // Disable other action buttons while one row is being edited
        document.querySelectorAll('.edit-record-btn').forEach(btn => {
            if (btn.dataset.id !== recordId) {
                btn.disabled = true;
            }
        });
        document.querySelectorAll('.delete-record-btn').forEach(btn => btn.disabled = true);
        document.querySelectorAll('.send-message-btn').forEach(btn => btn.disabled = true);
        document.querySelectorAll('.approve-record-btn').forEach(btn => btn.disabled = true); // Disable approve button

        const fields = ['name', 'program', 'set_year', 'level', 'email']; // 'id' is typically not editable
        const originalRecord = JSON.parse(row.dataset.originalRecord);

        fields.forEach(field => {
            const cell = row.querySelector(`td[data-field="${field}"]`);
            if (cell) {
                let inputElement;
                if (field === 'program') {
                    inputElement = document.createElement('select');
                    // Ensure these programs match your dashboard programs and database values
                    const programs = ["ABE", "AR", "CE", "ChE", "CpE", "ECE", "EE", "GE"];
                    programs.forEach(p => {
                        const option = document.createElement('option');
                        option.value = p;
                        option.textContent = p;
                        if (p === originalRecord[field]) {
                            option.selected = true;
                        }
                        inputElement.appendChild(option);
                    });
                } else if (field === 'email') {
                    inputElement = document.createElement('input');
                    inputElement.type = 'email';
                    inputElement.value = originalRecord[field];
                } else {
                    inputElement = document.createElement('input');
                    inputElement.type = 'text';
                    inputElement.value = originalRecord[field];
                }
                inputElement.style.width = '100%';
                inputElement.style.padding = '5px';
                inputElement.style.border = '1px solid #ccc';
                inputElement.style.borderRadius = '3px';
                inputElement.style.fontSize = '0.9em';
                cell.innerHTML = ''; // Clear cell content
                cell.appendChild(inputElement); // Append the new input element
            }
        });

        const actionsCell = row.querySelector('.actions-cell');
        actionsCell.innerHTML = `
            <button class="save-record-btn action-button green-button" data-id="${recordId}">Save</button>
            <button class="cancel-edit-btn action-button gray-button" data-id="${recordId}">Cancel</button>
        `;

        actionsCell.querySelector('.save-record-btn').addEventListener('click', function() {
            saveRecord(recordId);
        });
        actionsCell.querySelector('.cancel-edit-btn').addEventListener('click', function() {
            cancelEdit(recordId);
        });
    }

    // Function to save a record after editing
    function saveRecord(recordId) {
        // MODIFIED: Use data-record-id for selection
        const row = recordsTableBody.querySelector(`tr[data-record-id="${recordId}"]`);
        if (!row) return;

        const updatedData = {
            id: recordId,
            name: row.querySelector('td[data-field="name"] input').value.trim(),
            program: row.querySelector('td[data-field="program"] select').value.trim(),
            set_year: row.querySelector('td[data-field="set_year"] input').value.trim(),
            level: row.querySelector('td[data-field="level"] input').value.trim(),
            email: row.querySelector('td[data-field="email"] input').value.trim()
        };

        if (!updatedData.name || !updatedData.program || !updatedData.set_year || !updatedData.level || !updatedData.email) {
            alert('All fields must be filled to save the record.');
            return;
        }

        fetch('../homepage/update_record.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedData),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                alert(data.message);
                fetchAndDisplayRecords();
            } else {
                alert('Error updating record: ' + data.message);
                cancelEdit(recordId);
            }
        })
        .catch(error => {
            console.error('Error updating record:', error);
            alert('Network error or server communication issue during update.');
            cancelEdit(recordId);
        });
    }

    // Function to cancel editing a record
    function cancelEdit(recordId) {
        fetchAndDisplayRecords();
    }

    // Function to send email request to server-side PHP
    function sendEmailToServer(recipientEmail, recipientName, recordId, sanctionLevel) {
        const statusSpan = document.getElementById(`status-${recordId}`);
        statusSpan.textContent = 'Sending...';
        statusSpan.style.color = 'blue';
        statusSpan.style.marginLeft = '5px';

        const subject = `Formal Sanction Notification - Student ID: ${recordId}`;

        let consequenceText = '';
        if (sanctionLevel >= 1 && sanctionLevel <= 3) {
            consequenceText = 'This may result in a formal warning and mandatory participation in a guidance counseling session.';
        } else if (sanctionLevel >= 4 && sanctionLevel <= 6) {
            consequenceText = 'This may result in academic probation and a requirement to complete a restorative justice program.';
        } else if (sanctionLevel >= 7 && sanctionLevel <= 9) {
            consequenceText = 'This may result in temporary suspension from academic activities and campus facilities.';
        } else if (sanctionLevel == 10) {
            consequenceText = 'This may result in permanent expulsion from the institution.';
        } else {
            consequenceText = 'Further details regarding the consequences will be provided by the Student Affairs Office.';
        }

        const body = `Dear ${recipientName},

Student ID: ${recordId}

We are writing to formally inform you that, following a review of your recent actions, you have been assigned a Level ${sanctionLevel} sanction under the student conduct code.

Sanction Level: ${sanctionLevel}

Please proceed to the COEA SC to resolve this issue.

We strongly encourage you to take this as an opportunity for reflection and improvement.`;

        const emailData = {
            recipientEmail: recipientEmail,
            subject: subject,
            body: body
        };

        fetch('/System/send_email.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(emailData),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                statusSpan.textContent = 'Sent!';
                statusSpan.style.color = 'green';
            } else {
                statusSpan.textContent = `Failed: ${data.message}`;
                statusSpan.style.color = 'red';
            }
        })
        .catch(error => {
            console.error('Error sending email:', error);
            statusSpan.textContent = 'Network error during send.';
            statusSpan.style.color = 'red';
        });
    }

    // Function to send approval request to server-side PHP
    function sendApprovalToServer(recordId, actionType) {
        const statusSpan = document.getElementById(`status-${recordId}`); // Use the existing status span
        if (statusSpan) {
            statusSpan.textContent = `Approving (${actionType})...`;
            statusSpan.style.color = 'blue';
            statusSpan.style.marginLeft = '5px';
        }

        fetch('../homepage/approve_record.php', { // Path to the new approve PHP script
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ recordId: recordId, actionType: actionType }),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                alert(data.message);
                if (statusSpan) {
                    statusSpan.textContent = 'Approved!';
                    statusSpan.style.color = 'green';
                }
                fetchAndDisplayRecords(); // Refresh the table as the record is moved
            } else {
                alert('Error approving record: ' + data.message);
                if (statusSpan) {
                    statusSpan.textContent = `Approval failed: ${data.message}`;
                    statusSpan.style.color = 'red';
                }
            }
        })
        .catch(error => {
            console.error('Error approving record:', error);
            alert('Network error or server communication issue during approval.');
            if (statusSpan) {
                statusSpan.textContent = 'Network error during approval.';
                statusSpan.style.color = 'red';
            }
        });
    }

    // Delete record via server-side PHP
    function deleteRecord(recordId) {
        fetch('../homepage/delete_record.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: recordId }),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                alert(data.message);
                fetchAndDisplayRecords();
            } else {
                alert('Error deleting record: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error deleting record:', error);
            alert('Network error or server communication issue during deletion.');
        });
    }


    // Event listener for Apply Filter button
    applyFilterBtn.addEventListener('click', function() {
        const searchTerm = filterSearchTermInput.value.trim();
        const filterType = filterTypeSelect.value;
        fetchAndDisplayRecords(filterType, searchTerm);
    });

    // Event listener for Clear Filter button
    clearFilterBtn.addEventListener('click', function() {
        filterSearchTermInput.value = '';
        filterTypeSelect.value = 'name';
        fetchAndDisplayRecords();
    });

    // Initial call to fetch and display records when the page loads
    fetchAndDisplayRecords();
});
