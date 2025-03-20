document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const examHallsContainer = document.getElementById('exam-halls');
    const dateSelect = document.getElementById('dateSelect');
    const timeSelect = document.getElementById('timeSelect');
    const examSelect = document.getElementById('examSelect');
    const subjectNameSpan = document.getElementById('subject-name');
    const totalRoomsSpan = document.getElementById('total-rooms');
    const availableSeatsSpan = document.getElementById('available-seats');
    const roomsSelectedSpan = document.getElementById('rooms-selected');
    const seatsSelectedSpan = document.getElementById('seats-selected');
    const totalParticipantsSpan = document.getElementById('total-participants');
    const remainingParticipantsSpan = document.getElementById('remaining-participants');
    const emptySeatsSpan = document.getElementById('empty-seats');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sort');
    const arrangeBtn = document.getElementById('arrangeBtn');
    const debugPanel = document.getElementById('debugPanel');
    const debugInfo = document.getElementById('debugInfo');
    const closeDebugBtn = document.getElementById('closeDebugBtn');
    const viewAllotmentsBtn = document.getElementById('viewAllotmentsBtn');
    const allotmentsModal = document.getElementById('allotmentsModal');
    const closeAllotmentsModal = document.getElementById('closeAllotmentsModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const allotmentsModalContent = document.getElementById('allotmentsModalContent');
    const allotmentList = document.getElementById('allotment-list');
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const noAllotmentsMessage = document.getElementById('no-allotments-message');

    // Data variables
    let rooms = JSON.parse(localStorage.getItem('rooms')) || [];
    let exams = JSON.parse(localStorage.getItem('exams')) || [];
    let studentData = JSON.parse(localStorage.getItem('studentData')) || [];
    let allotments = JSON.parse(localStorage.getItem('allotments')) || [];
    let allotmentToDelete = null; // Store the allotment to be deleted
    let currentExam = null; // Store the currently selected exam

    // Add IDs to existing allotments if they don't have one
    allotments = allotments.map(allotment => {
        if (!allotment.id) {
            allotment.id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
        }
        return allotment;
    });
    localStorage.setItem('allotments', JSON.stringify(allotments));

    // Debug function to show information
    function showDebugInfo(message, data) {
        debugInfo.innerHTML = `<p>${message}</p>`;
        if (data) {
            debugInfo.innerHTML += `<pre>${JSON.stringify(data, null, 2)}</pre>`;
        }
        debugPanel.classList.remove('hidden');
    }

    // Close debug panel
    closeDebugBtn.addEventListener('click', function() {
        debugPanel.classList.add('hidden');
    });

    // Helper function to normalize strings for comparison
    function normalizeString(str) {
        if (str === null || str === undefined) return '';
        return String(str).trim().toLowerCase();
    }

    // Helper function to check if a student is eligible for an exam
    function isStudentEligibleForExam(student, exam) {
        if (!student || !exam) return false;
        
        // Normalize branch and semester for comparison
        const studentBranch = normalizeString(student.Branch);
        const examBranch = normalizeString(exam.branch);
        
        const studentSemester = normalizeString(student.Semester);
        const examSemester = normalizeString(exam.semester);
        
        const examSubject = normalizeString(exam.subject);
        
        // Check branch and semester match
        if (studentBranch !== examBranch || studentSemester !== examSemester) {
            return false;
        }
        
        // Check if any of the student's subjects match the exam subject
        for (let i = 1; i <= 5; i++) {
            const subjectKey = `Subject ${i}`;
            if (student[subjectKey] && normalizeString(student[subjectKey]) === examSubject) {
                return true;
            }
        }
        
        return false;
    }

    // Get the count of students already allocated for the current exam
    function getAllocatedStudentsCount(exam) {
        if (!exam) return 0;
        
        // Find allotments for this specific exam
        const currentExamAllotments = allotments.filter(allotment => 
            allotment.date === exam.date && 
            allotment.branch === exam.branch && 
            allotment.semester === exam.semester &&
            normalizeString(allotment.subject) === normalizeString(exam.subject)
        );
        
        // Count total students in these allotments
        return currentExamAllotments.reduce((total, allotment) => {
            // If totalStudents is directly available, use it
            if (allotment.totalStudents) {
                return total + parseInt(allotment.totalStudents);
            }
            
            // Otherwise, calculate from allocation details
            return total + allotment.allocation.reduce((sum, a) => 
                sum + (a.allocatedSeats ? parseInt(a.allocatedSeats) : 0), 0);
        }, 0);
    }

    function updateStatistics() {
        const selectedRooms = rooms.filter(room => room.isSelected);
        totalRoomsSpan.textContent = rooms.length;
        availableSeatsSpan.textContent = rooms.reduce((sum, room) => sum + parseInt(room.availableSeats || 0), 0);
        roomsSelectedSpan.textContent = selectedRooms.length;
        seatsSelectedSpan.textContent = selectedRooms.reduce((sum, room) => sum + parseInt(room.availableSeats || 0), 0);
        
        // Get the selected exam directly from the select element
        const selectedExamValue = examSelect.value;
        const selectedExamText = examSelect.options[examSelect.selectedIndex]?.text || '';
        
        // Extract subject name from the selected option text
        let subjectName = '-';
        if (selectedExamText) {
            // Extract subject name from format "Subject Name (Semester-Branch-Slot)"
            const match = selectedExamText.match(/(.*?)\s*\(/);
            if (match && match[1]) {
                subjectName = match[1].trim();
            }
        }
        
        // Update subject name in statistics panel
        subjectNameSpan.textContent = subjectName;
        
        // Find the exam object that matches the selected value
        if (selectedExamValue) {
            // Parse the selected value to get semester, branch, and slot
            const [semester, branch, slot] = selectedExamValue.split('-');
            
            // Find the matching exam in the exams array
            currentExam = exams.find(e => 
                e.semester === semester && 
                e.branch === branch && 
                e.slot === slot &&
                e.date === dateSelect.value // Add date check to ensure correct exam is selected
            );
            
            if (currentExam) {
                // Get total eligible participants for this exam
                const totalParticipants = getParticipantsCount(currentExam);
                totalParticipantsSpan.textContent = totalParticipants;
                
                // Get already allocated students for this exam
                const allocatedStudents = getAllocatedStudentsCount(currentExam);
                
                // Calculate remaining participants (total minus allocated)
                const remainingParticipants = Math.max(0, totalParticipants - allocatedStudents);
                remainingParticipantsSpan.textContent = remainingParticipants;
                
                // Calculate empty seats (selected seats minus remaining participants)
                const selectedSeats = parseInt(seatsSelectedSpan.textContent || 0);
                const emptySeats = Math.max(0, selectedSeats - remainingParticipants);
                emptySeatsSpan.textContent = emptySeats;
                
                // Debug info to verify calculations
                console.log(`Exam: ${currentExam.subject}, Total: ${totalParticipants}, Allocated: ${allocatedStudents}, Remaining: ${remainingParticipants}`);
            } else {
                // Reset statistics if no matching exam is found
                resetStatistics();
            }
        } else {
            // Reset statistics if no exam is selected
            resetStatistics();
        }
    }

    // Helper function to reset statistics when no exam is selected
    function resetStatistics() {
        // Keep the subject name as is, just reset the numeric values
        totalParticipantsSpan.textContent = '0';
        remainingParticipantsSpan.textContent = '0';
        emptySeatsSpan.textContent = '0';
        currentExam = null;
    }

    function getParticipantsCount(exam) {
        if (!exam) return 0;
        
        const eligibleStudents = studentData.filter(student => isStudentEligibleForExam(student, exam));
        return eligibleStudents.length;
    }

    function populateExamData() {
        dateSelect.innerHTML = '<option value="">Select Date</option>';
        timeSelect.innerHTML = '<option value="">Select Time</option>';
        examSelect.innerHTML = '<option value="">Select Exam</option>';

        const uniqueDates = [...new Set(exams.map(exam => exam.date))];
        uniqueDates.forEach(date => {
            const option = document.createElement('option');
            option.value = date;
            option.textContent = date;
            dateSelect.appendChild(option);
        });

        const uniqueTimes = [...new Set(exams.map(exam => exam.time))];
        uniqueTimes.forEach(time => {
            const option = document.createElement('option');
            option.value = time;
            option.textContent = time;
            timeSelect.appendChild(option);
        });

        updateExamOptions();
    }

    function updateExamOptions() {
        const selectedDate = dateSelect.value;
        const selectedTime = timeSelect.value;
        
        // Filter exams based on selected date and time
        const filteredExams = exams.filter(exam => 
            (!selectedDate || exam.date === selectedDate) && 
            (!selectedTime || exam.time === selectedTime)
        );
        
        examSelect.innerHTML = '<option value="">Select Exam</option>';
        
        // Group exams by subject to avoid duplicates
        const examsBySubject = {};
        
        filteredExams.forEach(exam => {
            const key = `${exam.subject}-${exam.semester}-${exam.branch}-${exam.slot}`;
            examsBySubject[key] = exam;
        });
        
        // Add each unique exam to the dropdown
        Object.values(examsBySubject).forEach(exam => {
            const option = document.createElement('option');
            // Store semester, branch, and slot as the value for precise identification
            option.value = `${exam.semester}-${exam.branch}-${exam.slot}`;
            option.textContent = `${exam.subject} (${exam.semester}-${exam.branch}-${exam.slot})`;
            examSelect.appendChild(option);
        });

        // Reset current exam and update statistics
        resetStatistics();
        updateStatistics();
        
        // Reset room selection when date/time changes
        rooms.forEach(room => room.isSelected = false);
        renderExamHalls();
    }

    function searchAndSortRooms() {
        const searchTerm = searchInput.value.toLowerCase();
        const sortOrder = sortSelect.value;

        let filteredRooms = rooms.filter(room => 
            (room.roomNo && room.roomNo.toString().toLowerCase().includes(searchTerm)) ||
            (room.block && room.block.toString().toLowerCase().includes(searchTerm)) ||
            (room.floorNo && room.floorNo.toString().includes(searchTerm)) ||
            (room.availableSeats && room.availableSeats.toString().includes(searchTerm))
        );

        filteredRooms.sort((a, b) => {
            const seatsA = parseInt(a.availableSeats || 0);
            const seatsB = parseInt(b.availableSeats || 0);
            
            if (sortOrder === 'increasing') {
                return seatsA - seatsB; // Increasing order (smallest first)
            } else {
                return seatsB - seatsA; // Decreasing order (largest first)
            }
        });

        renderExamHalls(filteredRooms);
    }

    // Check if a room is already allotted for the selected date and time
    function isRoomAllotted(roomNo, date, time) {
        if (!date || !time) return false;
        
        return allotments.some(allotment => 
            allotment.date === date && 
            allotment.time === time && 
            allotment.allocation.some(a => a.roomNo === roomNo)
        );
    }

    // Check if the selected exam would create a conflict (same class, same day, different exams)
    function wouldCreateConflict(exam) {
        if (!exam || !exam.date || !exam.branch || !exam.semester) return false;
        
        return allotments.some(allotment => 
            allotment.date === exam.date && 
            allotment.branch === exam.branch && 
            allotment.semester === exam.semester && 
            normalizeString(allotment.subject) !== normalizeString(exam.subject)
        );
    }

    function renderExamHalls(roomsToRender = rooms) {
        examHallsContainer.innerHTML = '';
        
        // Get selected exam details for allotment check
        const selectedDate = dateSelect.value;
        const selectedTime = timeSelect.value;
        
        roomsToRender.forEach((room, index) => {
            const isAllotted = isRoomAllotted(room.roomNo, selectedDate, selectedTime);
            
            const hallElement = document.createElement('div');
            hallElement.className = `flex items-center justify-center w-32 h-16 ${room.isSelected ? 'bg-blue-300' : 'bg-gray-300'} ${isAllotted ? 'border-2 border-red-500' : ''} rounded-lg m-2 cursor-pointer relative`;
            hallElement.innerHTML = `
                <div class="text-center">
                    <div class="text-black font-bold">${room.roomNo || 'Unknown'}</div>
                    <div class="text-green-500 text-lg">${room.availableSeats || 0}</div>
                </div>
            `;
            
            // Add tooltip for allotted status
            if (isAllotted) {
                const tooltip = document.createElement('div');
                tooltip.className = 'absolute hidden bg-red-600 text-white text-xs rounded py-1 px-2 -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap';
                tooltip.textContent = 'Already allotted';
                hallElement.appendChild(tooltip);
                
                hallElement.addEventListener('mouseenter', () => {
                    tooltip.classList.remove('hidden');
                });
                
                hallElement.addEventListener('mouseleave', () => {
                    tooltip.classList.add('hidden');
                });
            }
            
            hallElement.addEventListener('click', () => {
                // Prevent selection if already allotted
                if (isAllotted) {
                    alert(`Room ${room.roomNo} is already allotted for this date and time slot.`);
                    return;
                }
                
                // Prevent selection if no exam is selected
                if (!currentExam) {
                    alert('Please select an exam first before selecting rooms.');
                    return;
                }
                
                room.isSelected = !room.isSelected;
                renderExamHalls(roomsToRender);
                updateStatistics();
            });
            
            examHallsContainer.appendChild(hallElement);
        });
    }

    function allocateSeats(participants, selectedRooms) {
        let allocation = [];
        let remainingParticipants = [...participants]; // Create a copy of the participants array
        
        // Sort rooms by capacity (largest first) to optimize allocation
        const sortedRooms = [...selectedRooms].sort((a, b) => 
            parseInt(b.availableSeats || 0) - parseInt(a.availableSeats || 0)
        );
        
        for (let room of sortedRooms) {
            const roomCapacity = parseInt(room.availableSeats || 0);
            if (roomCapacity <= 0) continue; // Skip rooms with no capacity
            
            // Calculate how many students we can allocate to this room
            const seatsToAllocate = Math.min(remainingParticipants.length, roomCapacity);
            
            if (seatsToAllocate <= 0) continue; // Skip if no students to allocate
            
            // Get the students for this room
            const allocatedParticipants = remainingParticipants.splice(0, seatsToAllocate);
            
            // Add this room's allocation to the result
            allocation.push({
                roomNo: room.roomNo,
                allocatedSeats: seatsToAllocate,
                participants: allocatedParticipants
            });
            
            // If no more students, we're done
            if (remainingParticipants.length === 0) break;
        }
        
        // Check if we have unallocated students
        if (remainingParticipants.length > 0) {
            console.warn(`Warning: ${remainingParticipants.length} students could not be allocated. Need more rooms.`);
            alert(`Warning: ${remainingParticipants.length} students could not be allocated. Please select more rooms.`);
        }
        
        return allocation;
    }

    arrangeBtn.addEventListener('click', function() {
        if (!currentExam) {
            alert('Please select an exam.');
            return;
        }

        const selectedRooms = rooms.filter(room => room.isSelected);
        
        if (selectedRooms.length === 0) {
            alert('Please select at least one room.');
            return;
        }
        
        // Check for conflicts (same class, same day, different exams)
        if (wouldCreateConflict(currentExam)) {
            if (!confirm(`Warning: This class (${currentExam.semester}-${currentExam.branch}) already has another exam scheduled on the same day. Continue anyway?`)) {
                return;
            }
        }
        
        // Check for room allotment conflicts
        const conflictingRooms = selectedRooms.filter(room => 
            isRoomAllotted(room.roomNo, currentExam.date, currentExam.time)
        );
        
        if (conflictingRooms.length > 0) {
            const roomList = conflictingRooms.map(r => r.roomNo).join(', ');
            alert(`The following rooms are already allotted for this date and time: ${roomList}`);
            return;
        }
        
        // Calculate total available seats in selected rooms
        const totalAvailableSeats = selectedRooms.reduce((sum, room) => sum + parseInt(room.availableSeats || 0), 0);
        
        // Find eligible students for this exam
        const eligibleStudents = studentData.filter(student => isStudentEligibleForExam(student, currentExam));
        
        // Get already allocated students for this exam
        const allocatedStudents = getAllocatedStudentsCount(currentExam);
        
        // Calculate remaining students to allocate
        const remainingToAllocate = Math.max(0, eligibleStudents.length - allocatedStudents);
        
        // If all students are already allocated, show a message
        if (remainingToAllocate === 0) {
            alert(`All students for ${currentExam.subject} have already been allocated.`);
            return;
        }
        
        // Get the unallocated students
        const unallocatedStudents = eligibleStudents.slice(0, remainingToAllocate);
        
        // Sort participants by roll number
        unallocatedStudents.sort((a, b) => {
            const rollA = a['Roll No'] || '';
            const rollB = b['Roll No'] || '';
            return rollA.localeCompare(rollB);
        });
        
        // Check if we have enough seats
        if (totalAvailableSeats < unallocatedStudents.length) {
            if (!confirm(`Warning: You have ${unallocatedStudents.length} students to allocate but only ${totalAvailableSeats} seats available. Some students may not be allocated. Continue anyway?`)) {
                return;
            }
        }

        const allocation = allocateSeats(unallocatedStudents, selectedRooms);
        
        // Only save if we have some allocation
        if (allocation.length > 0) {
            const allotment = {
                id: Date.now().toString(), // Add a unique ID for each allotment
                exam: examSelect.value,
                subject: currentExam.subject,
                date: currentExam.date,
                time: currentExam.time,
                semester: currentExam.semester,
                branch: currentExam.branch,
                allocation: allocation,
                totalStudents: allocation.reduce((sum, a) => sum + a.allocatedSeats, 0),
                timestamp: new Date().toISOString()
            };
            
            // Add the new allotment to the beginning of the array
            allotments.unshift(allotment);
            localStorage.setItem('allotments', JSON.stringify(allotments));
            
            displayAllocationResults(allocation, currentExam, unallocatedStudents.length);
            
            // Reset room selection after successful allocation
            rooms.forEach(room => room.isSelected = false);
            renderExamHalls();
            
            // Update the UI after allocation
            updateAllotmentsList();
            updateStatistics();
        }
    });

    function displayAllocationResults(allocation, exam, totalStudents) {
        // Check if there's already a results container and remove it
        const existingContainer = document.querySelector('.allocation-results-container');
        if (existingContainer) {
            existingContainer.remove();
        }
        
        // Create the results container
        const resultsContainer = document.createElement('div');
        resultsContainer.className = 'allocation-results-container bg-white p-6 rounded-lg shadow-lg mt-4 fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3/4 max-h-[90vh] overflow-auto z-50';
        
        // Add header with exam details
        let resultHTML = `
            <div class="flex justify-between items-start mb-6">
                <div class="w-1/2">
                    <p class="mb-1"><span class="font-bold">Subject:</span> ${exam.subject}</p>
                    <p class="mb-1"><span class="font-bold">Date:</span> ${exam.date}</p>
                    <p class="mb-1"><span class="font-bold">Time:</span> ${exam.time}</p>
                </div>
                <div class="w-1/2">
                    <p class="mb-1"><span class="font-bold">Semester:</span> ${exam.semester}</p>
                    <p class="mb-1"><span class="font-bold">Branch:</span> ${exam.branch}</p>
                    <p class="mb-1"><span class="font-bold">Total Students:</span> ${totalStudents}</p>
                </div>
            </div>
            <div class="absolute top-4 right-4">
                <button class="text-gray-500 hover:text-gray-700 close-results">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // Format the allocation results for each room
        allocation.forEach(room => {
            resultHTML += `
                <div class="mb-8">
                    <h3 class="text-xl font-bold mb-2">Room ${room.roomNo}</h3>
                    <p class="mb-4"><span class="font-bold">Allocated Seats:</span> ${room.allocatedSeats}</p>
                    
                    <div class="overflow-x-auto">
                        <table class="min-w-full border border-gray-300">
                            <thead>
                                <tr class="bg-gray-100">
                                    <th class="border border-gray-300 px-4 py-2 text-left">S.No</th>
                                    <th class="border border-gray-300 px-4 py-2 text-left">Roll No</th>
                                    <th class="border border-gray-300 px-4 py-2 text-left">Name</th>
                                    <th class="border border-gray-300 px-4 py-2 text-left">Seat No</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            
            room.participants.forEach((student, index) => {
                resultHTML += `
                    <tr>
                        <td class="border border-gray-300 px-4 py-2">${index + 1}</td>
                        <td class="border border-gray-300 px-4 py-2">${student['Roll No'] || '-'}</td>
                        <td class="border border-gray-300 px-4 py-2">${student.Name || '-'}</td>
                        <td class="border border-gray-300 px-4 py-2">${index + 1}</td>
                    </tr>
                `;
            });
            
            resultHTML += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        });

        // Add print button at the bottom
        resultHTML += `
            <div class="flex justify-end mt-6">
                <button id="printAllotmentBtn" class="bg-blue-600 text-white px-4 py-2 rounded-md">
                    <i class="fas fa-print mr-2"></i>Print
                </button>
            </div>
        `;

        resultsContainer.innerHTML = resultHTML;
        
        // Add the container to the page
        document.body.appendChild(resultsContainer);
        
        // Add event listener to close button
        resultsContainer.querySelector('.close-results').addEventListener('click', function() {
            resultsContainer.remove();
        });

        // Add event listener to print button
        resultsContainer.querySelector('#printAllotmentBtn').addEventListener('click', function() {
            const printWindow = window.open('', '_blank');
            
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Exam Allocation - ${exam.subject}</title>
                    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                    <style>
                        @media print {
                            body { font-size: 12pt; }
                            table { border-collapse: collapse; width: 100%; }
                            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
                            th { background-color: #f0f0f0; }
                            .page-break { page-break-after: always; }
                        }
                    </style>
                </head>
                <body class="p-8">
                    <div class="flex justify-between items-start mb-6">
                        <div class="w-1/2">
                            <p class="mb-1"><span class="font-bold">Subject:</span> ${exam.subject}</p>
                            <p class="mb-1"><span class="font-bold">Date:</span> ${exam.date}</p>
                            <p class="mb-1"><span class="font-bold">Time:</span> ${exam.time}</p>
                        </div>
                        <div class="w-1/2">
                            <p class="mb-1"><span class="font-bold">Semester:</span> ${exam.semester}</p>
                            <p class="mb-1"><span class="font-bold">Branch:</span> ${exam.branch}</p>
                            <p class="mb-1"><span class="font-bold">Total Students:</span> ${totalStudents}</p>
                        </div>
                    </div>
            `);
            
            // Add each room's allocation to the print window
            allocation.forEach((room, roomIndex) => {
                printWindow.document.write(`
                    <div class="${roomIndex > 0 ? 'page-break' : ''}">
                        <h3 class="text-xl font-bold mb-2">Room ${room.roomNo}</h3>
                        <p class="mb-4"><span class="font-bold">Allocated Seats:</span> ${room.allocatedSeats}</p>
                        
                        <table class="min-w-full border border-gray-300">
                            <thead>
                                <tr class="bg-gray-100">
                                    <th class="border border-gray-300 px-4 py-2 text-left">S.No</th>
                                    <th class="border border-gray-300 px-4 py-2 text-left">Roll No</th>
                                    <th class="border border-gray-300 px-4 py-2 text-left">Name</th>
                                    <th class="border border-gray-300 px-4 py-2 text-left">Seat No</th>
                                </tr>
                            </thead>
                            <tbody>
                `);
                
                room.participants.forEach((student, index) => {
                    printWindow.document.write(`
                        <tr>
                            <td class="border border-gray-300 px-4 py-2">${index + 1}</td>
                            <td class="border border-gray-300 px-4 py-2">${student['Roll No'] || '-'}</td>
                            <td class="border border-gray-300 px-4 py-2">${student.Name || '-'}</td>
                            <td class="border border-gray-300 px-4 py-2">${index + 1}</td>
                        </tr>
                    `);
                });
                
                printWindow.document.write(`
                            </tbody>
                        </table>
                    </div>
                `);
            });
            
            printWindow.document.write(`
                </body>
                </html>
            `);
            
            printWindow.document.close();
            printWindow.focus();
            
            // Print after a short delay to ensure styles are loaded
            setTimeout(() => {
                printWindow.print();
            }, 500);
        });

        alert('Exam hall allotment saved successfully!');
    }

    // Update the allotments list in the sidebar
    function updateAllotmentsList() {
        if (allotments.length === 0) {
            noAllotmentsMessage.classList.remove('hidden');
            allotmentList.innerHTML = '';
            return;
        }
        
        noAllotmentsMessage.classList.add('hidden');
        allotmentList.innerHTML = '';
        
        // Sort allotments by date (newest first)
        const sortedAllotments = [...allotments].sort((a, b) => {
            return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
        });
        
        // Show only the 5 most recent allotments
        const recentAllotments = sortedAllotments.slice(0, 5);
        
        recentAllotments.forEach(allotment => {
            const allotmentItem = document.createElement('div');
            allotmentItem.className = 'border-b border-gray-200 py-2 last:border-0 relative';
            
            allotmentItem.innerHTML = `
                <p class="font-semibold">${allotment.subject}</p>
                <div class="flex justify-between text-sm text-gray-600">
                    <span>${allotment.date} (${allotment.time})</span>
                    <span>${allotment.semester}-${allotment.branch}</span>
                </div>
                <div class="text-sm text-gray-500 mt-1">
                    <span>${allotment.totalStudents} students</span>
                    <span class="mx-1">•</span>
                    <span>${allotment.allocation.length} rooms</span>
                </div>
                <button class="absolute top-2 right-2 text-red-500 hover:text-red-700 delete-allotment" data-id="${allotment.id}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            `;
            
            // Add click event to view this specific allotment
            allotmentItem.addEventListener('click', (e) => {
                // Don't trigger view if clicking on delete button
                if (e.target.closest('.delete-allotment')) return;
                displayAllotmentDetails(allotment);
            });
            
            // Add delete button event
            const deleteBtn = allotmentItem.querySelector('.delete-allotment');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showDeleteConfirmation(allotment);
            });
            
            allotmentList.appendChild(allotmentItem);
        });
        
        // Add a "View All" link if there are more than 5 allotments
        if (allotments.length > 5) {
            const viewMoreLink = document.createElement('div');
            viewMoreLink.className = 'text-center mt-2 text-blue-600 cursor-pointer';
            viewMoreLink.textContent = 'View all allotments...';
            viewMoreLink.addEventListener('click', () => {
                showAllotmentsModal();
            });
            allotmentList.appendChild(viewMoreLink);
        }
        
        // Update statistics after updating allotments list
        updateStatistics();
    }

    // Display details for a specific allotment
    function displayAllotmentDetails(allotment) {
        // Create a mock exam object to reuse the displayAllocationResults function
        const exam = {
            subject: allotment.subject,
            date: allotment.date,
            time: allotment.time,
            semester: allotment.semester,
            branch: allotment.branch
        };
        
        displayAllocationResults(allotment.allocation, exam, allotment.totalStudents);
    }

    // Show delete confirmation modal
    function showDeleteConfirmation(allotment) {
        allotmentToDelete = allotment;
        deleteConfirmModal.classList.remove('hidden');
    }

    // Delete an allotment
    function deleteAllotment(allotmentId) {
        const index = allotments.findIndex(a => a.id === allotmentId);
        if (index !== -1) {
            allotments.splice(index, 1);
            localStorage.setItem('allotments', JSON.stringify(allotments));
            updateAllotmentsList();
            updateStatistics();
            alert('Allotment deleted successfully.');
        }
    }

    // Event listeners for delete confirmation modal
    cancelDeleteBtn.addEventListener('click', function() {
        deleteConfirmModal.classList.add('hidden');
        allotmentToDelete = null;
    });
    
    confirmDeleteBtn.addEventListener('click', function() {
        if (allotmentToDelete) {
            deleteAllotment(allotmentToDelete.id);
            deleteConfirmModal.classList.add('hidden');
            allotmentToDelete = null;
        }
    });
    
    // Close modal when clicking outside
    deleteConfirmModal.addEventListener('click', function(e) {
        if (e.target === deleteConfirmModal) {
            deleteConfirmModal.classList.add('hidden');
            allotmentToDelete = null;
        }
    });

    // Show the modal with all allotments
    function showAllotmentsModal() {
        allotmentsModalContent.innerHTML = '';
        
        if (allotments.length === 0) {
            allotmentsModalContent.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-clipboard-list text-4xl mb-2"></i>
                    <p>No allotments available.</p>
                </div>
            `;
        } else {
            // Sort allotments by date (newest first)
            const sortedAllotments = [...allotments].sort((a, b) => {
                // First sort by date
                const dateA = a.date.split('-').reverse().join('-');
                const dateB = b.date.split('-').reverse().join('-');
                const dateCompare = dateB.localeCompare(dateA);
                
                if (dateCompare !== 0) return dateCompare;
                
                // Then by time
                const timeA = a.time === 'MORNING' ? 0 : 1;
                const timeB = b.time === 'MORNING' ? 0 : 1;
                return timeA - timeB;
            });
            
            // Group allotments by date
            const allotmentsByDate = {};
            sortedAllotments.forEach(allotment => {
                if (!allotmentsByDate[allotment.date]) {
                    allotmentsByDate[allotment.date] = [];
                }
                allotmentsByDate[allotment.date].push(allotment);
            });
            
            // Create a section for each date
            Object.keys(allotmentsByDate).sort((a, b) => {
                // Sort dates in descending order (newest first)
                const dateA = a.split('-').reverse().join('-');
                const dateB = b.split('-').reverse().join('-');
                return dateB.localeCompare(dateA);
            }).forEach(date => {
                const dateSection = document.createElement('div');
                dateSection.className = 'mb-6';
                
                // Format date for display
                const [day, month, year] = date.split('-');
                const formattedDate = new Date(`${year}-${month}-${day}`).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                
                dateSection.innerHTML = `
                    <h3 class="text-lg font-semibold mb-3">${formattedDate}</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 allotments-grid"></div>
                `;
                
                const allotmentsGrid = dateSection.querySelector('.allotments-grid');
                
                // Add each allotment for this date
                allotmentsByDate[date].forEach(allotment => {
                    const allotmentCard = document.createElement('div');
                    allotmentCard.className = 'bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative';
                    
                    allotmentCard.innerHTML = `
                        <div class="flex justify-between items-start">
                            <div>
                                <h4 class="font-semibold">${allotment.subject}</h4>
                                <p class="text-sm text-gray-600">${allotment.semester}-${allotment.branch}</p>
                            </div>
                            <div class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                ${allotment.time}
                            </div>
                        </div>
                        <div class="mt-3 text-sm">
                            <div class="flex justify-between text-gray-500">
                                <span>${allotment.totalStudents} students</span>
                                <span>${allotment.allocation.length} rooms</span>
                            </div>
                            <div class="mt-2">
                                <span class="text-xs bg-gray-200 px-2 py-1 rounded">
                                    Rooms: ${allotment.allocation.map(a => a.roomNo).join(', ')}
                                </span>
                            </div>
                        </div>
                        <button class="absolute top-2 right-2 text-red-500 hover:text-red-700 delete-modal-allotment" data-id="${allotment.id}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    `;
                    
                    // Add click event to view this specific allotment
                    allotmentCard.addEventListener('click', (e) => {
                        // Don't trigger view if clicking on delete button
                        if (e.target.closest('.delete-modal-allotment')) return;
                        allotmentsModal.classList.add('hidden');
                        displayAllotmentDetails(allotment);
                    });
                    
                    // Add delete button event
                    const deleteBtn = allotmentCard.querySelector('.delete-modal-allotment');
                    deleteBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        allotmentsModal.classList.add('hidden');
                        showDeleteConfirmation(allotment);
                    });
                    
                    allotmentsGrid.appendChild(allotmentCard);
                });
                
                allotmentsModalContent.appendChild(dateSection);
            });
        }
        
        allotmentsModal.classList.remove('hidden');
    }

    // Event listeners for modal
    closeAllotmentsModal.addEventListener('click', function() {
        allotmentsModal.classList.add('hidden');
    });
    
    closeModalBtn.addEventListener('click', function() {
        allotmentsModal.classList.add('hidden');
    });
    
    // Close modal when clicking outside
    allotmentsModal.addEventListener('click', function(e) {
        if (e.target === allotmentsModal) {
            allotmentsModal.classList.add('hidden');
        }
    });

    // View allotments button
    viewAllotmentsBtn.addEventListener('click', function() {
        showAllotmentsModal();
    });

    // Event listeners for selection changes
    dateSelect.addEventListener('change', function() {
        updateExamOptions();
    });
    
    timeSelect.addEventListener('change', function() {
        updateExamOptions();
    });
    
    examSelect.addEventListener('change', function() {
        // Update current exam and statistics when exam selection changes
        const selectedExamValue = examSelect.value;
        if (selectedExamValue) {
            // Parse the selected value to get semester, branch, and slot
            const [semester, branch, slot] = selectedExamValue.split('-');
            
            // Find the matching exam in the exams array
            currentExam = exams.find(e => 
                e.semester === semester && 
                e.branch === branch && 
                e.slot === slot &&
                e.date === dateSelect.value // Add date check to ensure correct exam is selected
            );
        } else {
            currentExam = null;
        }
        
        updateStatistics();
        renderExamHalls();
    });
    
    searchInput.addEventListener('input', searchAndSortRooms);
    sortSelect.addEventListener('change', searchAndSortRooms);

    // Initialize the page
    renderExamHalls();
    populateExamData();
    updateAllotmentsList();
    
    // Add a custom event listener for allotment changes
    document.addEventListener('allotmentChanged', function() {
        updateStatistics();
    });
    
    // Dispatch the event whenever allotments are changed
    function notifyAllotmentChanged() {
        document.dispatchEvent(new Event('allotmentChanged'));
    }
});