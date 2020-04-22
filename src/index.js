/**
 * Build styles
 */
require('./index.css').toString();

/**
 * RecordScreen Tool for the Editor.js 2.0
 */
class RecordScreen {

    static get toolbox() {
        return {
            title: '录屏',
            icon: require('./../assets/icon.svg').default,
        };
    }

    constructor({ data, api, config }) {

        this.data = data;
        this.api = api;

        this.config = config || {};
        this.config.output = this.config.output || null;

        this.index = this.api.blocks.getCurrentBlockIndex() + 1;

        this.wrapper = {
            block: document.createElement('div'),
            renderSettings: document.createElement('div')
        };

        this.video = null;

        /**
         * Styles
         */
        this.CSS = {
            baseClass: this.api.styles.block,
            loading: this.api.styles.loader,
            input: this.api.styles.input,
            button: this.api.styles.button,
            settingsButton: this.api.styles.settingsButton,
            settingsButtonActive: this.api.styles.settingsButtonActive,
            /**
             * Tool's classes
             */
            wrapperBlock: 'record-screen',
            blockTag: 'tag',
            video: 'record-video'

        };

    }

    get title() {
        return "录屏"
    }

    render() {
        this.wrapper.block = document.createElement('div');
        this.wrapper.block.setAttribute("data-title", this.title);
        this.wrapper.block.classList.add(this.CSS.wrapperBlock);
        this.wrapper.block.classList.add(this.CSS.blockTag);

        //按钮
        this.wrapper.block.appendChild(this._createStartBtn());
        //录屏显示的video
        this.wrapper.block.appendChild(this._createVideo());

        return this.wrapper.block;
    }

    renderSettings() {
        this.wrapper.renderSettings = document.createElement('div');
        return this.wrapper.renderSettings;
    }

    save(blockContent) {
        return this.data
    }

    //显示录屏结果的video
    _createVideo() {
        let div = document.createElement("div");
        div.classList.add(this.CSS.video);
        let video = document.createElement("video");
        //video.classList.add(this.CSS.video);
        video.setAttribute("autoplay", true);
        this.video = video;
        div.appendChild(video);

        return div
    }

    _createStartBtn() {
        let button = document.createElement("button");
        button.classList.add(this.CSS.button);
        button.innerText = "开始录屏";

        let isRecord = false;
        this.api.listeners.on(button, 'click', async(e) => {
            e.preventDefault();
            //开始
            if (isRecord) {
                isRecord = false;
                this._stop();
            } else {
                this.video.parentElement.classList.add(this.CSS.loading);
                //this.wrapper.block.classList.remove(this.CSS.blockTag);
                this.video.srcObject = await this._startRecord();

                if (this.video.srcObject) {
                    isRecord = true;
                    button.innerText = "暂停";

                    setTimeout(() => {
                        //console.log(this.video.srcObject)
                        this.video.srcObject.oninactive = e => {
                            e.preventDefault();
                            isRecord = false;
                            button.innerText = "开始录屏";
                            this._stop();
                        };
                        this.video.parentElement.classList.remove(this.CSS.loading);
                        //this.wrapper.block.classList.add(this.CSS.blockTag);
                    }, 800);

                } else {
                    this.video.parentElement.classList.remove(this.CSS.loading);
                }

            }

        });
        return button;
    }

    async _startRecord() {
        var displayMediaOptions = {
            video: true,
            // audio: true,   not support
            cursor: 'always'
        }
        let captureStream = null;
        try {
            captureStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
        } catch (err) {
            console.error("Error: " + err);
            this._stop();
        }
        return captureStream;
    }

    _stop() {
        if (this.video && this.video.srcObject) {
            let tracks = this.video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
        }

    };




}

module.exports = RecordScreen;