// mediaFragmentRecorder.js 2017 guest271314
// https://github.com/guest271314/MediaFragmentRecorder

// https://github.com/guest271314/recordMediaFragments/blob/master/ts-ebml/ts-ebml-min.js
    const tsebml = require("ts-ebml");

    const video = document.querySelector("video");

    const videoStream = document.createElement("video");

    // `MediaSource`
    const mediaSource = new MediaSource();
    // for firefox 
    // see https://bugzilla.mozilla.org/show_bug.cgi?id=1259788
    const hasCaptureStream = HTMLMediaElement.prototype.hasOwnProperty("captureStream");

    const captureStream = mediaElement =>
      !!mediaElement.mozCaptureStream ? mediaElement.mozCaptureStream() : mediaElement.captureStream();

    let currentFragmentURL, currentBlobURL, fragments;

    videoStream.width = video.width;

    videoStream.height = video.height;

    const mimeCodec = "video/webm;codecs=vp8,opus";

    let cursor = 0;

    // https://gist.github.com/jsturgis/3b19447b304616f18657
    // https://www.w3.org/2010/05/video/mediaevents.html
    const multipleUrls = [
      // "https://media.w3.org/2010/05/sintel/trailer.mp4#t=0,5",
      "https://nickdesaulniers.github.io/netfix/demo/frag_bunny.mp4#t=55,60",
      "https://raw.githubusercontent.com/w3c/web-platform-tests/master/media-source/mp4/test.mp4#t=0,5",
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4#t=0,5",
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4#t=0,5",
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4#t=0,6",
      // "https://media.w3.org/2010/05/video/movie_300.mp4#t=30,36"
    ];

    const singleUrl = [
      "https://nickdesaulniers.github.io/netfix/demo/frag_bunny.mp4#t=0,1",
      "https://nickdesaulniers.github.io/netfix/demo/frag_bunny.mp4#t=1,2",
      "https://nickdesaulniers.github.io/netfix/demo/frag_bunny.mp4#t=2,3",
      "https://nickdesaulniers.github.io/netfix/demo/frag_bunny.mp4#t=3,4",
      "https://nickdesaulniers.github.io/netfix/demo/frag_bunny.mp4#t=4,5",
      "https://nickdesaulniers.github.io/netfix/demo/frag_bunny.mp4#t=5,6",
      "https://nickdesaulniers.github.io/netfix/demo/frag_bunny.mp4#t=6,7",
      "https://nickdesaulniers.github.io/netfix/demo/frag_bunny.mp4#t=7,8",
      "https://nickdesaulniers.github.io/netfix/demo/frag_bunny.mp4#t=8,9",
      "https://nickdesaulniers.github.io/netfix/demo/frag_bunny.mp4#t=9,10"
    ];

    const geckoUrl = [
      "https://mirrors.creativecommons.org/movingimages/webm/ScienceCommonsJesseDylan_240p.webm#t=10,11",
      "https://mirrors.creativecommons.org/movingimages/webm/ScienceCommonsJesseDylan_240p.webm#t=11,12",
      "https://mirrors.creativecommons.org/movingimages/webm/ScienceCommonsJesseDylan_240p.webm#t=12,13",
      "https://mirrors.creativecommons.org/movingimages/webm/ScienceCommonsJesseDylan_240p.webm#t=13,14",
      "https://mirrors.creativecommons.org/movingimages/webm/ScienceCommonsJesseDylan_240p.webm#t=14,15",
      "https://mirrors.creativecommons.org/movingimages/webm/ScienceCommonsJesseDylan_240p.webm#t=15,16",
      "https://mirrors.creativecommons.org/movingimages/webm/ScienceCommonsJesseDylan_240p.webm#t=16,17",
      "https://mirrors.creativecommons.org/movingimages/webm/ScienceCommonsJesseDylan_240p.webm#t=17,18",
      "https://mirrors.creativecommons.org/movingimages/webm/ScienceCommonsJesseDylan_240p.webm#t=18,19",
      "https://mirrors.creativecommons.org/movingimages/webm/ScienceCommonsJesseDylan_240p.webm#t=19,20"

    ];

    const mediaFragmentRecorder = async(urls) => {
      // `ts-ebml`
      const tsebmlTools = async() => ({
        decoder: new tsebml.Decoder(),
        encoder: new tsebml.Encoder(),
        reader: new tsebml.Reader(),
        tools: tsebml.tools
      });
      // create `ArrayBuffer` from `Blob`
      const readAsArrayBuffer = (blob) => {
          return new Promise((resolve, reject) => {
            const fr = new FileReader();
            fr.readAsArrayBuffer(blob);
            fr.onloadend = () => {
              resolve(fr.result);
            };
            fr.onerror = (ev) => {
              reject(ev.error);
            };
          });
        }
        // `urls`: string or array of URLs
        // record each media fragment
      const recordMediaFragments = async(video, mimeCodec, decoder, encoder, reader, tools, ...urls) => {
          urls = [].concat(...urls);
          const media = [];
          for (let url of urls) {
            await new Promise(async(resolve) => {

              let mediaStream, recorder;

              videoStream.onprogress = e => {
                videoStream.onprogress = null;
                console.log("loading " + url)
              }

              videoStream.oncanplay = async(e) => {

                videoStream.oncanplay = null;
                videoStream.play();

                mediaStream = captureStream(videoStream);
                console.log(mediaStream);

                recorder = new MediaRecorder(mediaStream, {
                  mimeType: mimeCodec
                });

                recorder.ondataavailable = async(e) => {
                  // set metadata of recorded media fragment `Blob`
                  const mediaBlob = await setMediaMetadata(e.data);
                  // create `ArrayBuffer` of `Blob` of recorded media fragment
                  const mediaBuffer = await readAsArrayBuffer(mediaBlob);
                  const mediaDuration = videoStream.played.end(0) - videoStream.played.start(0);
                  const mediaFragmentId = currentFragmentURL || new URL(url);
                  const mediaFileName = mediaFragmentId.pathname.split("/").pop() + mediaFragmentId.hash;
                  const mediaFragmentType = "singleMediaFragment";
                  if (currentBlobURL) {
                    URL.revokeObjectURL(currentBlobURL);
                  }
                  media.push({
                    mediaBlob, mediaBuffer, mediaDuration, mediaFragmentType, mediaFileName
                  });
                  resolve();

                }
                recorder.start();
              }
              videoStream.onpause = e => {
                videoStream.onpause = null;
                cursor = videoStream.currentTime;
                recorder.stop();
                // stop `MediaStreamTrack`s
                for (let track of mediaStream.getTracks()) {
                  track.stop();
                }
              }
              currentFragmentURL = new URL(url);
              if (!hasCaptureStream) {
                console.log(currentFragmentURL);
                request = new Request(currentFragmentURL.href);
                blob = await fetch(request).then(response => response.blob());
                console.log(blob);
                currentBlobURL = URL.createObjectURL(blob);
                if (urls.indexOf(currentFragmentURL.href) > 0 && new URL(urls[urls.indexOf(currentFragmentURL.href) - 1]).origin === currentFragmentURL.origin && new URL(urls[urls.indexOf(currentFragmentURL.href) - 1]).pathname === currentFragmentURL.pathname) {
                  if (cursor > 0) {
                    url = url = currentBlobURL + currentFragmentURL.hash.replace(/=\d+/, "=" + cursor);
                    console.log(url)
                  }
                } else {
                  url = currentBlobURL + currentFragmentURL.hash;
                }
              } else {
                if (cursor > 0 && new URL(urls[urls.indexOf(url) - 1]).origin === currentFragmentURL.origin && new URL(urls[urls.indexOf(currentFragmentURL.href) - 1]).pathname === currentFragmentURL.pathname) {
                  url = url.replace(/=\d+/, "=" + cursor);
                  console.log(url)
                }
              }


              videoStream.src = url;
            }).catch(err => err)
          }
          return media
        }
        // set metadata of media `Blob`
        // see https://github.com/legokichi/ts-ebml/issues/14#issuecomment-325200151
      const setMediaMetadata = async(blob) =>
        tsebmlTools()
        .then(async({
          decoder, encoder, tools, reader
        }) => {

          let webM = new Blob([], {
            type: "video/webm"
          });

          webM = new Blob([webM, blob], {
            type: blob.type
          });

          const buf = await readAsArrayBuffer(blob);
          const elms = decoder.decode(buf);
          elms.forEach((elm) => {
            reader.read(elm);
          });

          reader.stop();

          const refinedMetadataBuf = tools.makeMetadataSeekable(reader.metadatas, reader.duration, reader.cues);

          const webMBuf = await readAsArrayBuffer(webM);

          const body = webMBuf.slice(reader.metadataSize);
          const refinedWebM = new Blob([refinedMetadataBuf, body], {
            type: webM.type
          });
          // close Blobs
          if (webM.close && blob.close) {
            webM.close();
            blob.close();
          }

          return refinedWebM;
        })
        .catch(err => console.error(err));


      let mediaTools = await tsebmlTools();

      const {
        decoder, encoder, reader, tools
      } = mediaTools;

      const mediaFragments = await recordMediaFragments(video, mimeCodec, decoder, encoder, reader, tools, urls);

      const recordedMedia = await new Promise((resolveAllMedia, rejectAllMedia) => {
        console.log(decoder, encoder, tools, reader, mediaFragments);

        let mediaStream, recorder;

        mediaSource.onsourceended = e => {
          console.log(video.buffered.start(0), video.buffered.end(0));
          video.currentTime = video.buffered.start(0);

          console.log(video.paused, video.readyState);

          video.ontimeupdate = e => {

            console.log(video.currentTime, mediaSource.duration);
            if (video.currentTime >= mediaSource.duration) {
              video.ontimeupdate = null;
              video.oncanplay = null;
              video.onwaiting = null;
              if (recorder.state === "recording") {
                recorder.stop();
              }
              console.log(e, recorder);

            }
          }
        }
        video.onended = (e) => {
          video.onended = null;
          console.log(e, video.currentTime,
            mediaSource.duration);
        }
        video.oncanplay = e => {
          console.log(e, video.duration, video.buffered.end(0));
          video.play()
        }
        video.onwaiting = e => {
            console.log(e, video.currentTime);
            if (HTMLMediaElement.prototype.hasOwnProperty("seekToNextFrame")) {
              // audio is not rendered
              // video.seekToNextFrame()
            }
          }
          // record `MediaSource` playback of recorded media fragments
        video.onplaying = async(e) => {
          console.log(e);
          video.onplaying = null;

          mediaStream = captureStream(video);
          if (!hasCaptureStream) {
            videoStream.srcObject = mediaStream;
            videoStream.play();
          }
          recorder = new MediaRecorder(mediaStream, {
            mimeType: mimeCodec
          });
          console.log(recorder);

          recorder.ondataavailable = async(e) => {
            console.log(e);

            const mediaFragmentsRecording = {};

            mediaFragmentsRecording.mediaBlob = await setMediaMetadata(e.data);
            mediaFragmentsRecording.mediaBuffer = await readAsArrayBuffer(mediaFragmentsRecording.mediaBlob);
            mediaFragmentsRecording.mediaFileName = urls.map(url => {
              const id = new URL(url);
              return id.pathname.split("/").pop() + id.hash
            }).join("-");
            mediaFragmentsRecording.mediaFragmentType = "multipleMediaFragments";
            // `<video>` to play concatened media fragments
            // recorded from playback of `MediaSource`
            fragments = document.createElement("video");
            fragments.id = "fragments";
            fragments.width = video.width;
            fragments.height = video.height;
            fragments.controls = true;
            fragments.onloadedmetadata = () => {
              fragments.onloadedmetadata = null;
              mediaFragmentsRecording.mediaDuration = fragments.duration;
              // URL.revokeObjectURL(currentBlobURL);
              // stop `MediaStreamTrack`s
              for (let track of mediaStream.getTracks()) {
                track.stop();
              }
              resolveAllMedia([
                ...mediaFragments, mediaFragmentsRecording
              ]);

            }
            currentBlobURL = URL.createObjectURL(mediaFragmentsRecording.mediaBlob);
            fragments.src = currentBlobURL;
            document.body.appendChild(fragments);

          }

          recorder.start();
        }

        video.src = URL.createObjectURL(mediaSource);

        mediaSource.addEventListener("sourceopen", sourceOpen);

        async function sourceOpen(e) {

          if (MediaSource.isTypeSupported(mimeCodec)) {
            const sourceBuffer = mediaSource.addSourceBuffer(mimeCodec);
            sourceBuffer.mode = "sequence";
            for (let {
                mediaBuffer, mediaDuration
              }
              of mediaFragments) {


              await new Promise((resolveUpdatedMediaSource) => {

                sourceBuffer.onupdateend = async(e) => {
                  sourceBuffer.onupdateend = null;
                  console.log(e, mediaDuration, mediaSource.duration, video.paused, video.ended, video.currentTime, "media source playing", video.readyState);

                  // https://bugzilla.mozilla.org/show_bug.cgi?id=1400587
                  // https://bugs.chromium.org/p/chromium/issues/detail?id=766002&q=label%3AMSEptsdtsCleanup
                  try {
                    sourceBuffer.timestampOffset += mediaDuration;
                    resolveUpdatedMediaSource();
                  } catch (err) {
                    console.error(err);
                    resolveUpdatedMediaSource();
                  }
                }
                sourceBuffer.appendBuffer(mediaBuffer);
              })
            }

            mediaSource.endOfStream()

          } else {
            console.warn(mimeCodec + " not supported");
          }
        };

      })

      return recordedMedia
    };







