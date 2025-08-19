<?php
// update_record.php - Handles updating records in the database

// Set content type to JSON for the response
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Allow CORS for development
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database connection details - ***UPDATE THESE***
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "sanction";

// Create a new MySQLi connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    error_log("update_record.php - Database connection failed: " . $conn->connect_error);
    echo json_encode(['success' => false, 'message' => 'Database connection failed.']);
    exit();
}

// Get the raw POST data (assuming JSON is sent from JavaScript)
$json_data = file_get_contents('php://input');
$data = json_decode($json_data, true);

if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
    error_log("update_record.php - Invalid JSON data received.");
    echo json_encode(['success' => false, 'message' => 'Invalid JSON data received.']);
    exit();
}

// Extract updated data from the decoded JSON
$record_id = $data['id'] ?? ''; // This is the ID used for the WHERE clause
$name = $data['name'] ?? '';
$program = $data['program'] ?? '';
$set_year = $data['set_year'] ?? '';
$level = $data['level'] ?? '';
$email = $data['email'] ?? '';

// Basic validation
if (empty($record_id) || empty($name) || empty($program) || empty($set_year) || empty($level) || empty($email)) {
    echo json_encode(['success' => false, 'message' => 'All fields are required for update.']);
    $conn->close();
    exit();
}

// Prepare SQL UPDATE statement
$stmt = $conn->prepare("UPDATE records SET name = ?, program = ?, set_year = ?, level = ?, email = ? WHERE id = ?");

if ($stmt === false) {
    error_log("update_record.php - SQL prepare failed: " . $conn->error);
    echo json_encode(['success' => false, 'message' => 'SQL prepare failed.']);
    $conn->close();
    exit();
}

// Bind parameters: 'ssssss' for (name, program, set_year, level, email, id) - all strings
$stmt->bind_param("ssssss", $name, $program, $set_year, $level, $email, $record_id);

if ($stmt->execute()) {
    if ($stmt->affected_rows > 0) {
        echo json_encode(['success' => true, 'message' => 'Record updated successfully!']);
    } else {
        // This could mean the record ID wasn't found, or no data actually changed
        echo json_encode(['success' => false, 'message' => 'Record found but no changes applied or ID not found.']);
    }
} else {
    error_log("update_record.php - SQL Execute Error: " . $stmt->error);
    if ($conn->errno == 1062) { // Duplicate entry error
        echo json_encode(['success' => false, 'message' => 'Error: Email already exists for another record.']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error updating record: ' . $stmt->error]);
    }
}

$stmt->close();
$conn->close();

?>
