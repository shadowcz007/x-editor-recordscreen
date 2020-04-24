/**
 * Build styles
 */
require('./index.css').toString();

const RecordRTC = require('recordrtc/RecordRTC');
const ml5 = require('ml5');

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
        this.recorder = null;
        this.userStream = null;
        this.screenStream = null;
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
                this.video.muted = true;

                let streams = await this._initMediaDevices();

                this.recorder = RecordRTC(streams, {
                    type: 'video',
                    mimeType: 'video/webm',
                    previewStream: (s) => {
                        this.video.srcObject = s;
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

                this.recorder.startRecording();

            }

        });
        return button;
    }

    _keepStreamActive(stream) {
        var video = document.createElement('video');
        video.muted = true;
        video.srcObject = stream;
        video.setAttribute('autoplay', true);
        //video.style.display = 'none';
        video.style.position = "fixed";
        video.style.top = '0px';
        video.style.opacity = 0;
        video.style.zIndex = -22;
        this.wrapper.block.appendChild(video);
        return video
    }

    async _initMediaDevices() {


        let userStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
        });
        //console.log(userStream)

        let screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true
        });

        screenStream.width = window.screen.width;
        screenStream.height = window.screen.height;
        screenStream.fullcanvas = true;

        userStream.width = 440;
        userStream.height = 360;

        let screenVideo = this._keepStreamActive(screenStream);
        this.userVideo = this._keepStreamActive(userStream);

        this.screenStream = screenStream;
        this.userStream = userStream;

        screenStream.oninactive = () => {
            this._stop();
        }
        userStream.oninactive = () => {
            this._stop();
        }


        //把用户摄像头的视频流 经过过 canvas处理
        let userCanvas = document.createElement('canvas');
        userCanvas.width = userStream.width;
        userCanvas.height = userStream.height;

        this.context = userCanvas.getContext('2d');

        //this.wrapper.block.appendChild(userCanvas);

        var canvasStream = userCanvas.captureStream(15);
        var newUserStream = new MediaStream();
        newUserStream.width = userStream.width;
        newUserStream.height = userStream.height;
        newUserStream.top = screenStream.height - newUserStream.height;
        newUserStream.left = screenStream.width - newUserStream.width;

        // "getTracks" is RecordRTC's built-in function
        RecordRTC.getTracks(canvasStream, 'video').forEach(function(videoTrack) {
            newUserStream.addTrack(videoTrack);
        });
        // "getTracks" is RecordRTC's built-in function
        // RecordRTC.getTracks(userStream, 'audio').forEach(function(audioTrack) {
        //     newUserStream.addTrack(audioTrack);
        // });


        this.recorder = 1;
        this._video2Stream(0);

        return [screenStream, newUserStream]
    }

    _createCanvas(w, h) {
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        let ctx = canvas.getContext('2d');
        return ctx;
    }

    // Convert a ImageData to a Canvas
    _imageDataToCanvas(imageData, x, y) {
        // console.log(raws, x, y)
        const arr = Array.from(imageData);

        const ctx = this._createCanvas(x, y);

        const imgData = ctx.createImageData(x, y);
        const { data } = imgData;

        for (let i = 0; i < x * y * 4; i += 1) data[i] = arr[i];
        ctx.putImageData(imgData, 0, 0);

        return ctx.canvas;
    };

    async _bodypix(orginCanvas) {
        let bodypix = await ml5.bodyPix();
        //console.log(bodypix)
        let segmentation = await bodypix.segment(orginCanvas);
        console.log(segmentation)
        let ctx = this._createCanvas(orginCanvas.width, orginCanvas.height);
        ctx.drawImage(orginCanvas, 0, 0);

        let maskedBackground = await this._imageDataToCanvas(segmentation.raw.backgroundMask.data, segmentation.raw.backgroundMask.width, segmentation.raw.backgroundMask.height)

        ctx.globalCompositeOperation = "destination-out";
        ctx.drawImage(maskedBackground, 0, 0);

        return ctx.canvas;

    }

    async _video2Stream(tries) {
        //console.log(context)
        if (!this.recorder) return; // ignore/skip on stop-recording
        if (tries > 10) {
            // this.context.canvas.width = this.userVideo.videoWidth;
            // this.context.canvas.height = this.userVideo.videoHeight;

            let ctx = this._createCanvas(this.userStream.width * 0.2, this.userStream.height * 0.2);
            ctx.drawImage(this.userVideo, 0, 0, this.userStream.width * 0.2, this.userStream.height * 0.2);
            let bc = await this._bodypix(ctx.canvas);
            this.context.clearRect(0, 0, this.userStream.width, this.userStream.height);
            this.context.drawImage(bc, 0, 0, this.userStream.width, this.userStream.height);
            //this.context.fillRect(10, 10, 10, 10);
            //console.log(this.userVideo.videoHeight, this.context.canvas.height, this.userStream.height)
        } else {
            tries += 1;
        };
        // repeat (looper)
        setTimeout(async() => {
            await this._video2Stream(tries);
        }, 100);
    }

    async _startRecord() {

        let streams = await this._initMediaDevices();

        // this.recorder = new RecordRTC(userStream, {
        //     recorderType: 'video',
        //     width: 640,
        //     height: 480,
        //     frameRate: 24,
        //     // workerPath: '../libs/webm-worker.js',
        //     // webAssemblyPath: '../libs/webm-wasm.wasm',
        // });

        // console.log(recorder)
        // const sleep = m => new Promise(r => setTimeout(r, m));
        // await sleep(3000);

        // await recorder.stopRecording();
        // let blob = await recorder.getBlob();
        // invokeSaveAsDialog(blob);

        // var displayMediaOptions = {
        //     video: true,
        //     // audio: true,   not support
        //     cursor: 'always'
        // }
        // let captureStream = null;
        // try {
        //     captureStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
        // } catch (err) {
        //     console.error("Error: " + err);
        //     this._stop();
        // }
        // return captureStream;
    }

    _stop() {
        if (this.video && this.video.srcObject) {
            let tracks = this.video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
        };
        if (this.userStream) {
            this.userStream.getTracks().forEach(track => track.stop());
        };
        if (this.screenStream) {
            this.screenStream.getTracks().forEach(track => track.stop());
        }
        this.recorder = null;
    };




}

module.exports = RecordScreen;