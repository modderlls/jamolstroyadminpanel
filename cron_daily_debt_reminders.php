<?php
// filename: cron_daily_debt_reminders.php

// Next.js API URL
$url = "https://adminuz.jamolstroy.uz/api/cron/daily-debt-reminders";

// Initialize cURL
$ch = curl_init();

// Set cURL options
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30); // maksimal 30 soniya kutadi (debt reminders ko'proq vaqt olishi mumkin)
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // HTTPS uchun
curl_setopt($ch, CURLOPT_USERAGENT, 'Cron Job Bot 1.0');

// Execute request
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

// Check for errors
if (curl_errno($ch)) {
    echo "cURL error: " . curl_error($ch) . "\n";
    echo "Date: " . date('Y-m-d H:i:s') . "\n";
} else {
    echo "HTTP Code: " . $httpCode . "\n";
    echo "Response: " . $response . "\n";
    echo "Date: " . date('Y-m-d H:i:s') . "\n";
}

// Close cURL
curl_close($ch);

// Log to file
$logFile = 'cron_debt_reminders.log';
$logEntry = date('Y-m-d H:i:s') . " - HTTP: $httpCode - Response: $response\n";
file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
?>
