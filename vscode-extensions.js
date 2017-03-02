/**
 * 28.01.17 - Found a not so pretty way to install extensions in Visual Studio code.
 */
var shell = require("shelljs");
var https = require('https');
var fs = require('fs');
var path = require('path');

var sPublisher = "abusaidm";
var sExtensionName = "html-snippets";
var sVersion = "0.1.0";

switch (process.argv[2]) {
    case "e":
    case "extract":
        extractExtensions();
        break;
    case "a":
    case "install_all_extensions":
        var sExtensions = shell.exec("code --list-extensions --show-versions", {silent: true}).stdout;
        shell.ls("extensions/*.vsix").forEach(function(sFilePath) {
            var sExtension = sFilePath.split("extensions/")[1].split('.vsix')[0];
            var [,sPublisher,sExtensionName,sVersion,] = sExtension.split(/(.+)_(.+)_(.+)/);
            var sExtensionToCompare = sPublisher + "." + sExtensionName + "@" + sVersion;
            if (!sExtensions.includes(sExtensionToCompare)) {
                installExtension(sFilePath);
            }
        });
        break;
    case "i":
    case "install_from_zip":
        if (shell.test("-e", "Microsoft.VisualStudio.Services.zip")) {
            shell.mv("Microsoft.VisualStudio.Services.zip", sVsixFileName);
            if (shell.exec("code --install-extension " + sVsixFileName).code !== 0) {
                shell.echo("Error: Couldn't load vsix package");
                process.exit(1);
            }
        }
        break;
    case "is":
    case "install_specific_extension":
        var sVsixFileName = process.argv[3];
        installExtension(sVsixFileName);
        break;
    default:
        sURL = getFormattedURL(sPublisher, sExtensionName, sVersion);
        console.log(sURL)
}

function getFormattedURL(sPublisher, sExtensionName, sVersion) {
    // https://${publisher}.gallery.vsassets.io/_apis/public/gallery/publisher/${publisher}/extension/${extension name}/${version}/assetbyname/Microsoft.VisualStudio.Services.VSIXPackage
    return "https://" + sPublisher + ".gallery.vsassets.io/_apis/public/gallery/publisher/" + sPublisher + "/extension/" + sExtensionName + "/" + sVersion + "/assetbyname/Microsoft.VisualStudio.Services.VSIXPackage";
}

function getFormattedVsixFileName(sPublisher, sExtensionName, sVersion) {
    return sPublisher + "_" + sExtensionName + "_" + sVersion + ".vsix";
}

function installExtension(sVsixFileName) {
    if (shell.test('-e', sVsixFileName)) {
        if (shell.exec("code --install-extension " + sVsixFileName).code !== 0) {
            shell.echo("Error: Couldn't load vsix package: " + sVsixFileName);
        }
    }
}

function extractExtensions() {
    var cmdListExtensions = shell.exec("code --list-extensions --show-versions", {
        silent: true
    });
    if (!cmdListExtensions.code) {
        shell.echo(cmdListExtensions.stdout).to("extensions/installed_extensions.txt");
        cmdListExtensions.stdout.split('\n').forEach(function (sExtension) {
            if (!sExtension) return;
            // Note: not sure why the first and last elements are empty!
            var [, sPublisher, sExtension, sVersion, ] = sExtension.split(/(.+)\.(.+)@(.+)/);
            var sURL = getFormattedURL(sPublisher, sExtension, sVersion);
            var sFileName = getFormattedVsixFileName(sPublisher, sExtension, sVersion);
            download(sURL, "extensions/" + sFileName);
        });
    }
}

// http://stackoverflow.com/questions/11944932/how-to-download-a-file-with-node-js-without-using-third-party-libraries
function download(url, dest, cb) {
    var file = fs.createWriteStream(dest);
    var request = https.get(url, function (response) {
        response.pipe(file);
        file.on('finish', function () {
            file.close(cb); // close() is async, call cb after close completes.
        });
    }).on('error', function (err) { // Handle errors
        fs.unlink(dest); // Delete the file async. (But we don't check the result)
        if (cb) cb(err.message);
    });
}