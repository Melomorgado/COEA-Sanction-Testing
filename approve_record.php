<?php
// approve_record.php - Handles moving a record from 'records' to 'sanction_logs'

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database connection details - ***UPDATE THESE***
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "sanction";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    error_log("approve_record.php - Database connection failed: " . $conn->connect_error);
    echo json_encode(['success' => false, 'message' => 'Database connection failed.']);
    exit();
}

$json_data = file_get_contents('php://input');
$data = json_decode($json_data, true);

if (json_last_error() !== JSON_ERROR_NONE || !is_array($data) || !isset($data['recordId']) || !isset($data['actionType'])) {
    error_log("approve_record.php - Invalid JSON or missing data: " . json_last_error_msg() . " | Raw: " . $json_data);
    echo json_encode(['success' => false, 'message' => 'Invalid request data.']);
    exit();
}

$recordId = trim($data['recordId']);
$actionType = trim($data['actionType']);

if (empty($recordId) || !in_array($actionType, ['Pay', 'Community Service'])) {
    echo json_encode(['success' => false, 'message' => 'Invalid record ID or action type.']);
    $conn->close();
    exit();
}

$conn->begin_transaction(); // Start a transaction for atomicity

try {
    // 1. Fetch the record from the 'records' table
    $stmt_select = $conn->prepare("SELECT id, name, program, set_year, level, email FROM records WHERE id = ?");
    if ($stmt_select === false) {
        throw new Exception("Failed to prepare select statement: " . $conn->error);
    }
    $stmt_select->bind_param("s", $recordId);
    $stmt_select->execute();
    $result = $stmt_select->get_result();
    $record = $result->fetch_assoc();
    $stmt_select->close();

    if (!$record) {
        throw new Exception("Record not found with ID: " . $recordId);
    }

    // 2. Insert the record into the 'sanction_logs' table
    $stmt_insert_log = $conn->prepare(
        "INSERT INTO sanction_logs (original_record_id, student_name, program, set_year, level, email, action_taken)
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    if ($stmt_insert_log === false) {
        throw new Exception("Failed to prepare log insert statement: " . $conn->error);
    }
    $stmt_insert_log->bind_param(
        "sssssss",
        $record['id'],
        $record['name'],
        $record['program'],
        $record['set_year'],
        $record['level'],
        $record['email'],
        $actionType
    );
    if (!$stmt_insert_log->execute()) {
        throw new Exception("Failed to insert into logs: " . $stmt_insert_log->error);
    }
    $stmt_insert_log->close();

    // 3. Delete the record from the 'records' table
    $stmt_delete = $conn->prepare("DELETE FROM records WHERE id = ?");
    if ($stmt_delete === false) {
        throw new Exception("Failed to prepare delete statement: " . $conn->error);
    }
    $stmt_delete->bind_param("s", $recordId);
    if (!$stmt_delete->execute()) {
        throw new Exception("Failed to delete from records: " . $stmt_delete->error);
    }
    $stmt_delete->close();

    $conn->commit(); // Commit the transaction if all operations were successful
    echo json_encode(['success' => true, 'message' => 'Record approved and moved to logs successfully.']);

} catch (Exception $e) {
    $conn->rollback(); // Rollback on error
    error_log("approve_record.php - Transaction failed: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Failed to approve record: ' . $e->getMessage()]);
}

$conn->close();
?>
