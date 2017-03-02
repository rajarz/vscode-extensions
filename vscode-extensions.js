/**
 * 28.01.17 - Found a not so pretty way to install extensions in Visual Studio code.
 * 03.02.17 - Created synchronization of extensions between machines.
 */
var shell = require("shelljs");
var https = require('https');
var fs = require('fs');
var path = require('path');

// Globals to ease with modification
var sPublisher = "abusaidm";
var sExtensionName = "html-snippets";
var sVersion = "0.1.0";

// Modify this if you decide to only
// install a subset of extensions.
var sExtensionsDir = "extensions/";

switch (process.argv[2]) {
    case "e":
    case "extract":
        extractExtensions();
        break;
    case "a":
    case "install_all_extensions":
        installAllExtensions();
        break;
    case "i":
    case "install_from_zip":
        // This was my first attempt at automating the installation
        // of an extension from the PROD to the gateway domain.
        installExtensionFromZip();
        break;
    case "is":
    case "install_specific_extension":
        installExtension(process.argv[3]);
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
    return sPublisher + "." + sExtensionName + "@" + sVersion + ".vsix";
}

function installExtension(sVsixFileName) {
    if (shell.test('-e', sVsixFileName)) {
        if (shell.exec("code --install-extension " + sVsixFileName).code !== 0) {
            shell.echo("Error: Couldn't load vsix package: " + sVsixFileName);
        }
    }
}

function installAllExtensions() {
    var sExtensions = shell.exec("code --list-extensions --show-versions", { silent: true }).stdout;

    shell.ls(sExtensionsDir + "*.vsix").forEach(function (sFilePath) {
        var sExtension = sFilePath.split(sExtensionsDir)[1].split('.vsix')[0];
        var sExtensionToCompare = sPublisher + "." + sExtensionName + "@" + sVersion;

        if (!sExtensions.includes(sExtensionToCompare)) {
            installExtension(sFilePath);
        }
    });
}

function installExtensionFromZip() {
    var sVsixFileName = getFormattedVsixFileName(sPublisher, sExtensionName, sVersion)
    if (shell.test("-e", "Microsoft.VisualStudio.Services.zip")) {
        shell.mv("Microsoft.VisualStudio.Services.zip", sVsixFileName);
        if (shell.exec("code --install-extension " + sVsixFileName).code !== 0) {
            shell.echo("Error: Couldn't load vsix package");
            process.exit(1);
        }
    }
}

function extractExtensions() {
    var cmdListExtensions = shell.exec("code --list-extensions --show-versions", {
        silent: true
    });
    if (!cmdListExtensions.code) {
        cmdListExtensions.stdout.split('\n').forEach(function (sExtension) {
            if (!sExtension) return;
            // Note: not sure why the first and last elements are empty!
            var [, sPublisher, sExtension, sVersion,] = sExtension.split(/(.+)\.(.+)@(.+)/);
            var sURL = getFormattedURL(sPublisher, sExtension, sVersion);
            var sFileName = getFormattedVsixFileName(sPublisher, sExtension, sVersion);
            download(sURL, sExtensionsDir + sFileName);
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