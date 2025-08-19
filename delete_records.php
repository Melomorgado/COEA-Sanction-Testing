<?php
// delete_record.php - Handles deleting records from the database

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

// Database connection details - ***UPDATE THESE IF THEY ARE NOT ALREADY CORRECT***
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "sanction";

// Create a new MySQLi connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    error_log("delete_record.php - Database connection failed: " . $conn->connect_error);
    echo json_encode(['success' => false, 'message' => 'Database connection failed.']);
    exit();
}

// Get the raw POST data (assuming JSON is sent from JavaScript)
$json_data = file_get_contents('php://input');
$data = json_decode($json_data, true);

if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
    error_log("delete_record.php - Invalid JSON data received.");
    echo json_encode(['success' => false, 'message' => 'Invalid JSON data received.']);
    exit();
}

$record_id = $data['id'] ?? ''; // Get the ID to delete

if (empty($record_id)) {
    echo json_encode(['success' => false, 'message' => 'Record ID is required for deletion.']);
    $conn->close();
    exit();
}

// Prepare SQL DELETE statement
$stmt = $conn->prepare("DELETE FROM records WHERE id = ?");

if ($stmt === false) {
    error_log("delete_record.php - SQL prepare failed: " . $conn->error);
    echo json_encode(['success' => false, 'message' => 'SQL prepare failed.']);
    $conn->close();
    exit();
}

$stmt->bind_param("s", $record_id); // 's' for string (as ID is VARCHAR)

if ($stmt->execute()) {
    if ($stmt->affected_rows > 0) {
        echo json_encode(['success' => true, 'message' => 'Record deleted successfully!']);
    } else {
        echo json_encode(['success' => false, 'message' => 'No record found with that ID to delete.']);
    }
} else {
    error_log("delete_record.php - SQL Execute Error: " . $stmt->error);
    echo json_encode(['success' => false, 'message' => 'Error deleting record: ' . $stmt->error]);
}

$stmt->close();
$conn->close();

?>
