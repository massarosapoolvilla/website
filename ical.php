<?php
// Дозволяємо CORS
header("Access-Control-Allow-Origin: *");
header("Content-Type: text/calendar; charset=utf-8");
header("Cache-Control: public, max-age=600"); // Кеш на 10 хвилин

$allowed = ["smartorder.ai", "airbnb.com", "booking.com", "agoda.com", "ical.net", "outlook.com", "google.com"];
$url = isset($_GET['url']) ? $_GET['url'] : '';

if (!$url) {
    http_response_code(403);
    echo "Bad URL";
    exit;
}

$parsed = parse_url($url);
$hostname = $parsed['host'] ?? '';

$isAllowed = false;
foreach ($allowed as $domain) {
    if ($hostname === $domain || (strlen($hostname) > strlen($domain) && substr($hostname, -strlen($domain)-1) === ".".$domain)) {
        $isAllowed = true;
        break;
    }
}

if (!$isAllowed) {
    http_response_code(403);
    echo "Domain not allowed";
    exit;
}

// Завантажуємо дані через cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode >= 200 && $httpCode < 300) {
    echo $response;
} else {
    http_response_code(502);
    echo "Upstream error " . $httpCode;
}
?>