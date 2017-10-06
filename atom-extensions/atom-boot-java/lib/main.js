const path = require('path');
const { JarLanguageClient, StsAdapter } = require('pivotal-atom-languageclient-commons');
const { Convert } = require('atom-languageclient');
const PROPERTIES = require('../properties.json');

const BOOT_DATA_MARKER_TYPE = 'BootApp-Hint';
const BOOT_HINT_GUTTER_NAME = 'boot-hint-gutter';

class BootJavaLanguageClient extends JarLanguageClient {

    constructor() {
        //noinspection JSAnnotator
        super(
            PROPERTIES.jarUrl,
            path.join(__dirname, '..', 'server'),
            'boot-java-language-server.jar'
        );
        this.DEBUG = true;
    }

    getGrammarScopes() {
        return ['source.java']
    }

    getLanguageName() {
        return 'boot-java'
    }

    getServerName() {
        return 'Spring Boot'
    }

    activate() {
        require('atom-package-deps')
            .install('boot-java')
            .then(() => console.debug('All dependencies installed, good to go'));
        super.activate();
    }

    compatibleJavaVersion(javaExecutablePath) {
        return super.compatibleJavaVersion(javaExecutablePath).then(version => {
            this.fileExists(`${javaExecutablePath}/bin/${this.correctBinname('javac')}`).then(exists => {
                if (!exists) {
                    const notification = atom.notifications.addWarning(`"Boot-Java" Package Functionality Limited`, {
                        dismissable: true,
                        detail: 'No JDK found',
                        description: 'JAVA_HOME environment variable does not point to JDK hence Boot Hints are unavailable',
                        buttons: [{
                            text: 'OK',
                            onDidClick: () => {
                                notification.dismiss()
                            },
                        }],
                    });
                }
            });
            return version;
        });
    }


    launchVmArgs(version) {
        return [
            '-Dorg.slf4j.simpleLogger.logFile=boot-java.log',
            '-Dorg.slf4j.simpleLogger.defaultLogLevel=debug',
            // '-Xdebug',
            // '-agentlib:jdwp=transport=dt_socket,server=y,address=7999,suspend=n'
        ];

    }

    createStsAdapter() {
        return new BootStsAdapter();
    }

}

class BootStsAdapter extends StsAdapter {

    constructor() {
        super();
    }

    onHighlight(params) {
        this.findEditors(params.doc.uri).forEach(editor => this.markHintsForEditor(editor, params.ranges));
    }

    markHintsForEditor(editor, ranges) {
        editor.findMarkers(BOOT_DATA_MARKER_TYPE).forEach(m => m.destroy());
        if (Array.isArray(ranges)) {
            ranges.forEach(range => this.createHintMarker(editor, range));
        }
        const gutter = editor.gutterWithName(BOOT_HINT_GUTTER_NAME);
        if (gutter) {
            if (!ranges || !ranges.length) {
                gutter.hide();
            } else if (!gutter.isVisible()) {
                gutter.show();
            }
        }
    }

    createHintMarker(editor, range) {
        // Create marker model
        const marker = editor.markBufferRange(Convert.lsRangeToAtomRange(range), BOOT_DATA_MARKER_TYPE);

        // Marker around the text in the editor
        editor.decorateMarker(marker, {
            type: 'highlight',
            class: 'boot-hint'
        });

        // Marker in the diagnostic gutter
        let gutter = editor.gutterWithName(BOOT_HINT_GUTTER_NAME);
        if (!gutter) {
            gutter = editor.addGutter({
                name: BOOT_HINT_GUTTER_NAME,
                visible: false,
            });
        }
        const iconElement = document.createElement('span');
        iconElement.setAttribute('class', 'gutter-boot-hint');
        gutter.decorateMarker(marker, {item: iconElement});
    }
}

module.exports = new BootJavaLanguageClient();