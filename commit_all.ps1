$files = (git status --porcelain | ForEach-Object { $_.Substring(3) })
$count = 0
foreach ($file in $files) {
    $count++
    $msg = "razak: update and optimize $file - component stability check"
    if ($file -like "*TechOps*") { $msg = "razak: implement premium tech ops dashboard for infrastructure control" }
    if ($file -like "*UsersSupport*") { $msg = "razak: rebuild users and support command center with school grouping" }
    if ($file -like "*P3LDevelopers*") { $msg = "razak: create secure super-admin registry and welcome email bridge" }
    if ($file -like "*AdminLayout*") { $msg = "razak: redesign admin sidebar and project isolation context" }
    if ($file -like "*server.js*") { $msg = "razak: integrate nodemailer welcome sequence and technical support bridge" }
    if ($file -like "*scratch*") { $msg = "razak: run technical audit and database integrity script for $file" }
    
    git add "$file"
    git commit -m "$msg"
    Write-Host "Committed $file ($count)"
}
