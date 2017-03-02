/**
 * 28.01 .17 - Found a not so pretty way to install extensions in Visual Studio code.
 * 03.02 .17 - Created synchronization of extensions between machines.
 */
var shell = require("shelljs");
var https = require('https');
var fs = require('fs');
var path = require('path');

// Globals to ease with modification
var sPublisher = "abusaidm";
var sExtensionName = "html-snippets";
var sVersion = "0.1.0";

// Modify this to install a subset of extensions.
// The "a" script will look within
var sExtensionsDir = "extensions/";

switch (process.argv[2]) {
    case "e":
        // TODO: shouldn't extract extensions already within sExtensionsDir
        extractExtensions();
        break;
    case "a":
        installAllExtensions();
        break;
    case "i":
        // This was my initial attempt at easing the installation of an
        // extension zip from the production to the gateway domain.
        // Not really using anymore.
        installExtensionFromZip();
        break;
    case "is":
        // TODO: Should take remainder of process arguments?
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
        if (shell.exec("code --install-extension " + sVsixFileName, {
                silent: true
            }).code !== 0) {
            shell.echo("Error: Couldn't load vsix package: " + sVsixFileName);
            process.exit(1);
        }
    }
}

function installAllExtensions() {
    var sExtensions = shell.exec("code --list-extensions --show-versions", {
        silent: true
    }).stdout;

    shell.ls(sExtensionsDir + "*.vsix").forEach(function (sFilePath) {
        var sExtension = sFilePath.split(sExtensionsDir)[1].split('.vsix')[0];

        if (!sExtensions.includes(sExtension)) {
            // only attempt to install those extensions that are not yet installed.
            installExtension(sFilePath);
        }
    });
}

function installExtensionFromZip() {
    var sVsixFileName = getFormattedVsixFileName(sPublisher, sExtensionName, sVersion)
    if (shell.test("-e", "Microsoft.VisualStudio.Services.zip")) {
        shell.mv("Microsoft.VisualStudio.Services.zip", sVsixFileName);
        if (shell.exec("code --install-extension " + sVsixFileName).code !== 0) {
            shell.echo("Error: Couldn't load vsix package: " + sVsixFileName);
            process.exit(1);
        }
    }
}

function extractExtensions() {
    var cmdListExtensions = shell.exec("code --list-extensions --show-versions", {
        silent: true
    });
    if (!shell.test('-e', sExtensionsDir)) {
        shell.mkdir('-p', sExtensionsDir);
    }
    // from this you can always re-install if required.
    shell.echo(cmdListExtensions.stdout).to(sExtensionsDir + "my_extensions.txt");

    if (!cmdListExtensions.code) {
        cmdListExtensions.stdout.split('\n').forEach(function (sExtension) {
            if (!sExtension) return;
            // TODO: not sure why the first and last elements are empty while splitting?
            var [, sPublisher, sExtension, sVersion, ] = sExtension.split(/(.+)\.(.+)@(.+)/);
            var sURL = getFormattedURL(sPublisher, sExtension, sVersion);
            var sFileName = getFormattedVsixFileName(sPublisher, sExtension, sVersion);
            download(sURL, sExtensionsDir + sFileName, function (error) {
                console.log(error);
            });
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