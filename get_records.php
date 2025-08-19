<?php
// get_records.php - Fetches records from the 'records' table with optional filtering

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Allow CORS for development

// Database connection details - ***UPDATE THESE***
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "sanction";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    error_log("get_records.php - Database connection failed: " . $conn->connect_error);
    echo json_encode(['success' => false, 'message' => 'Database connection failed.']);
    exit();
}

// Get filter parameters from GET request
$filterType = isset($_GET['filterType']) ? $_GET['filterType'] : '';
$searchTerm = isset($_GET['searchTerm']) ? $_GET['searchTerm'] : '';

// Base SQL query
$sql = "SELECT id, name, program, set_year, level, email FROM records";
$whereClauses = [];
$params = [];
$types = "";

// Define allowed filter columns to prevent SQL injection
$allowedFilterColumns = ['id', 'name', 'program', 'set_year', 'level', 'email'];

if (!empty($searchTerm) && in_array($filterType, $allowedFilterColumns)) {
    // For string-based columns, use LIKE for partial matches
    if (in_array($filterType, ['name', 'program', 'set_year', 'email'])) {
        $whereClauses[] = "$filterType LIKE ?";
        $params[] = '%' . $searchTerm . '%';
        $types .= "s";
    }
    // For numeric/exact match columns like 'id' and 'level'
    else if (in_array($filterType, ['id', 'level'])) {
        // Use '=' for exact match on ID and Level
        $whereClauses[] = "$filterType = ?";
        $params[] = $searchTerm;
        $types .= "s"; // Bind as string to handle potential non-numeric input gracefully
    }
}

if (!empty($whereClauses)) {
    $sql .= " WHERE " . implode(" AND ", $whereClauses);
}

// Order by name for consistent display
$sql .= " ORDER BY name ASC";

$stmt = $conn->prepare($sql);

if ($stmt === false) {
    error_log("get_records.php - Failed to prepare statement: " . $conn->error);
    echo json_encode(['success' => false, 'message' => 'Failed to prepare statement.']);
    $conn->close();
    exit();
}

if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}

$stmt->execute();
$result = $stmt->get_result();

$records = [];
if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $records[] = $row;
    }
    echo json_encode(['success' => true, 'data' => $records]);
} else {
    echo json_encode(['success' => true, 'data' => [], 'message' => 'No records found.']);
}

$stmt->close();
$conn->close();
?>
