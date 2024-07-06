import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Context } from "../../Context/Context";
import LoadingDots from "../LoadingDots";
import relaysOnPlatform from "../../Content/Relays";
import axiosInstance from "../../Helpers/HTTP_Client";
import { deletePost, publishPost } from "../../Helpers/NostrPublisher";
import { nanoid } from "nanoid";

export default function ToPublishNOSTR({
  postId = "",
  postKind,
  postContent = "",
  postTitle = "",
  postThumbnail,
  postDesc,
  tags,
  edit = false,
  exit,
}) {
  const { setToast, nostrKeys, nostrUser } = useContext(Context);
  const navigateTo = useNavigate();
  const [selectedCategories, setSelectedCategories] = useState(tags || []);
  const [thumbnail, setThumbnail] = useState("");
  const [thumbnailPrev, setThumbnailPrev] = useState(postThumbnail || "");
  const [thumbnailUrl, setThumbnailUrl] = useState(postThumbnail || "");
  const [desc, setDesc] = useState(postDesc || "");
  const [tempTag, setTempTag] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [contentSensitive, setContentSensitive] = useState(false);
  const [screen, setScreen] = useState(1);
  const [relaysToPublish, setRelaysToPublish] = useState([...relaysOnPlatform]);
  const [publishingState, setPublishingState] = useState([]);
  const [deleteDraft, setDeleteDraft] = useState(
    postKind === 30024 ? true : false
  );
  const [allRelays, setAllRelays] = useState([...relaysOnPlatform]);

  const handleImageUpload = (e) => {
    let file = e.target.files[0];
    if (file && !file.type.includes("image/")) {
      setToast({
        type: 2,
        desc: "Image type is unsupported!",
      });
      return;
    }
    if (file) {
      setThumbnail(file);
      setThumbnailPrev(URL.createObjectURL(file));
      setThumbnailUrl("");
    }
  };

  const initThumbnail = async () => {
    setThumbnail("");
    setThumbnailPrev("");
    setThumbnailUrl("");
  };

  const Submit = async (kind = 30023) => {
    try {
      setIsLoading(true);
      if (postThumbnail && thumbnail) deleteFromS3(postThumbnail);

      let cover = thumbnail ? await uploadToS3(thumbnail) : thumbnailUrl || "";

      let tags = [
        ["client", "yakihonne.com"],
        ["published_at", `${Date.now()}`],
        ["d", edit || nanoid()],
        ["image", cover],
        ["title", postTitle],
        ["summary", desc],
      ];
      for (let cat of selectedCategories) {
        tags.push(["t", cat]);
      }
      if (contentSensitive) {
        tags.push(["L", "content-warning"]);
      }
      if (deleteDraft) {
        await deletePost(nostrKeys, postId, relaysToPublish);
      }
      let temPublishingState = await publishPost(
        nostrKeys,
        kind,
        postContent,
        tags,
        relaysToPublish
      );
      console.log(temPublishingState);

      setIsLoading(false);
      if (!temPublishingState) {
        setToast({
          type: 2,
          desc: "Publishing was cancelled!",
        });
        return;
      }
      if (temPublishingState.find((item) => item.status)) {
        if (postThumbnail && thumbnail) deleteFromS3(postThumbnail);
        setPublishingState(temPublishingState);
        setScreen(3);
        setToast({
          type: 1,
          desc:
            kind === 30024
              ? "Your draft has been successfully saved!"
              : "Your article has been successfully posted on Nostr.",
        });
        return;
      }
      setToast({
        type: 2,
        desc: "Your article has been declined on the chosen relays.",
      });
      // } else {
      //   setToast({
      //     type: 2,
      //     desc: "Would you please upload a cover to your article.",
      //   });
      // }
    } catch (err) {
      setToast({
        type: 2,
        desc: "An error has occurred!",
      });
    }
  };
  const removeCategory = (cat) => {
    let index = selectedCategories.findIndex((item) => item === cat);
    let tempArray = Array.from(selectedCategories);
    tempArray.splice(index, 1);
    setSelectedCategories(tempArray);
  };
  const handleRelaysToPublish = (relay) => {
    let index = relaysToPublish.findIndex((item) => item === relay);
    let tempArray = Array.from(relaysToPublish);
    if (index === -1) {
      setRelaysToPublish([...relaysToPublish, relay]);
      return;
    }
    tempArray.splice(index, 1);
    setRelaysToPublish(tempArray);
  };
  const checkIfChecked = (relay) => {
    let index = relaysToPublish.findIndex((item) => item === relay);
    if (index === -1) return false;
    return true;
  };
  const uploadToS3 = async (img) => {
    if (img) {
      try {
        let fd = new FormData();
        fd.append("file", img);
        fd.append("pubkey", nostrKeys.pub);
        let data = await axiosInstance.post("/api/v1/file-upload", fd, {
          headers: { "Content-Type": "multipart/formdata" },
        });
        return data.data.image_path;
      } catch {
        setToast({
          type: 2,
          desc: `The image size exceeded the required limit, the max size allowed is 1Mb.`,
        });
        return false;
      }
    }
  };
  const deleteFromS3 = async (img) => {
    if (img.includes("yakihonne.s3")) {
      let data = await axiosInstance.delete("/api/v1/file-upload", {
        params: { image_path: img },
      });
      return true;
    }
    return false;
  };

  const handleThumbnailValue = (e) => {
    let value = e.target.value;
    setThumbnailUrl(value);
    setThumbnailPrev(value);
    setThumbnail("");
  };

  return (
    <section className="fixed-container fx-centered">
      {screen === 1 && (
        <div
          className="fx-centered fx-col slide-down box-pad-h"
          style={{
            // width: "100%",
            // maxWidth: "500px",
            flex: "1 1 500px",
            maxWidth: "500px",
          }}
        >
          <div className="fx-centered pointer" onClick={exit}>
            <div className="arrow" style={{ transform: "rotate(90deg)" }}></div>
            <p className="gray-c">back to editor</p>
          </div>
          <h4 className="p-centered">Publish your article</h4>
          <p className="gray-c p-medium box-marg-s">let's finish the job</p>
          <div
            className=" fx-centered fx-start-v fx-stretch fit-container"
            // style={{ width: "500px", }}
          >
            <div className="fx-centered fx-col fit-container">
              <div
                className="fit-container fx-centered fx-col sc-s box-pad-h bg-img cover-bg"
                style={{
                  position: "relative",
                  height: "200px",
                  backgroundImage: `url(${thumbnailPrev})`,
                  backgroundColor: "var(--dim-gray)",
                  // borderStyle: thumbnailPrev ? "none" : "dotted",
                }}
              >
                {thumbnailPrev && (
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      position: "absolute",
                      right: "16px",
                      top: "16px",
                      backgroundColor: "var(--dim-gray)",
                      borderRadius: "var(--border-r-50)",
                      zIndex: 10,
                    }}
                    className="fx-centered pointer"
                    onClick={initThumbnail}
                  >
                    <div className="trash"></div>
                  </div>
                )}

                {!thumbnailPrev && (
                  <>
                    {/* <div className="image-24"></div> */}
                    <p className="gray-c p-medium">(thumbnail preview)</p>
                  </>
                )}
              </div>
              <div className="fit-container fx-centered">
                <input
                  type="text"
                  className="if ifs-full"
                  placeholder="Image url..."
                  value={thumbnailUrl}
                  onChange={handleThumbnailValue}
                />
                <label
                  htmlFor="image-up"
                  className="fit-container fx-centered fx-col box-pad-h sc-s pointer bg-img cover-bg"
                  style={{
                    position: "relative",
                    minHeight: "50px",
                    minWidth: "50px",
                    maxWidth: "50px",
                  }}
                >
                  <div className="upload-file-24"></div>
                  <input
                    type="file"
                    id="image-up"
                    style={{
                      width: "100%",
                      height: "100%",
                      position: "absolute",
                      left: 0,
                      top: 0,
                      opacity: 0,
                    }}
                    value={thumbnail.fileName}
                    onChange={handleImageUpload}
                    // disabled={thumbnail}
                    className="pointer"
                    accept="image/jpg,image/png,image/gif"
                  />
                </label>
              </div>
              <textarea
                className="txt-area fit-container"
                placeholder="Write a description (optional)"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              ></textarea>
              <label
                className="fx-centered fx-start-h fit-container if"
                htmlFor={"content-sensitive-checkbox"}
              >
                <input
                  type="checkbox"
                  id={"content-sensitive-checkbox"}
                  checked={contentSensitive}
                  onChange={() => setContentSensitive(!contentSensitive)}
                />
                <p className={contentSensitive ? "" : "gray-c"}>
                  This is a sensitive content
                </p>
              </label>
              <form
                className="fit-container fx-scattered"
                onSubmit={(e) => {
                  e.preventDefault();
                  setSelectedCategories([...selectedCategories, tempTag]);
                  setTempTag("");
                }}
              >
                <input
                  type="text"
                  className="if ifs-full"
                  placeholder="keyword (optional)"
                  value={tempTag}
                  onChange={(e) => setTempTag(e.target.value)}
                />
                {tempTag && (
                  <button
                    className="btn btn-normal"
                    style={{ minWidth: "max-content" }}
                  >
                    Add tag
                  </button>
                )}
              </form>
              {selectedCategories.length > 0 && (
                <div className="fit-container box-pad-v-m fx-centered fx-col fx-start-h">
                  <p className="p-medium gray-c fit-container p-left">
                    Selected categories
                  </p>
                  <div className="fit-container  fx-scattered fx-wrap fx-start-h">
                    {selectedCategories.map((item, index) => {
                      return (
                        <div
                          key={`${item}-${index}`}
                          className="sticker sticker-gray-c1"
                          style={{ columnGap: "8px" }}
                        >
                          <span>{item}</span>
                          <p
                            className="p-medium pointer"
                            onClick={() => removeCategory(item)}
                          >
                            &#10005;
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <button
                className="btn btn-normal fx-centered"
                onClick={() => setScreen(2)}
              >
                Next{" "}
                <div className="arrow" style={{ filter: "invert()" }}></div>
              </button>
              {/* <button
              className={`btn btn-full ${
                thumbnailPrev && desc && selectedCategories.length > 0
                  ? "btn-normal"
                  : "btn-disabled"
              }`}
              disabled={
                !(thumbnailPrev && desc && selectedCategories.length > 0)
              }
              onClick={Submit}
            >
              {isLoading ? <LoadingDots /> : "Publish"}
            </button> */}
            </div>
          </div>
        </div>
      )}
      {screen === 2 && (
        <div
          className="fx-centered fx-col slide-up box-pad-h"
          style={{
            width: "500px",
          }}
        >
          <button
            className="btn btn-normal fx-centered box-marg-s"
            onClick={() => setScreen(1)}
            disabled={isLoading}
          >
            Previous{" "}
            <div
              className="arrow"
              style={{ filter: "invert()", transform: "rotate(-180deg)" }}
            ></div>
          </button>
          <div className="fx-centered fx-col">
            <h4 className="p-centered">Publish to your favorite relays</h4>
            <p className="gray-c p-medium">list of available relays</p>
            <p className="c1-c p-medium box-marg-s">
              (for more custom relays, check your settings)
            </p>
          </div>
          <div
            className="fit-container fx-centered fx-wrap"
            style={{ maxHeight: "40vh", overflow: "scroll" }}
          >
            {nostrUser?.relays?.length == 0 &&
              allRelays.map((url, index) => {
                if (index === 0)
                  return (
                    <label
                      className="fx-centered fx-start-h fit-container if"
                      htmlFor={`${url}-${index}`}
                      key={`${url}-${index}`}
                    >
                      <input
                        type="checkbox"
                        id={`${url}-${index}`}
                        checked
                        readOnly
                      />
                      <p>{url.split("wss://")[1]}</p>
                    </label>
                  );
                return (
                  <label
                    className="fx-centered fx-start-h fit-container if"
                    htmlFor={`${url}-${index}`}
                    key={`${url}-${index}`}
                  >
                    <input
                      type="checkbox"
                      id={`${url}-${index}`}
                      checked={checkIfChecked(url)}
                      onChange={() => handleRelaysToPublish(url)}
                    />
                    <p>{url.split("wss://")[1]}</p>
                  </label>
                );
              })}
            {nostrUser?.relays?.length > 0 &&
              nostrUser.relays.map((url, index) => {
                if (index < 2)
                  return (
                    <label
                      className="fx-centered fx-start-h fit-container if if-disabled"
                      htmlFor={`${url}-${index}`}
                      key={`${url}-${index}`}
                    >
                      <input
                        type="checkbox"
                        id={`${url}-${index}`}
                        checked
                        readOnly
                      />
                      <p className="c1-c">{url.split("wss://")[1]}</p>
                    </label>
                  );
                return (
                  <label
                    className="fx-centered fx-start-h fit-container if"
                    htmlFor={`${url}-${index}`}
                    key={`${url}-${index}`}
                  >
                    <input
                      type="checkbox"
                      id={`${url}-${index}`}
                      checked={checkIfChecked(url)}
                      onChange={() => handleRelaysToPublish(url)}
                    />
                    <p>{url.split("wss://")[1]}</p>
                  </label>
                );
              })}
          </div>
          {postKind === 30024 && (
            <>
              <hr className="box-marg-s" />
              <label
                htmlFor="check-draft"
                className="if ifs-full fx-centered"
                style={{ borderColor: deleteDraft ? "var(--blue-main)" : "" }}
              >
                <input
                  type="checkbox"
                  id="check-draft"
                  checked={deleteDraft}
                  onChange={() => setDeleteDraft(!deleteDraft)}
                />
                <p className={deleteDraft ? "" : "gray-c"}>
                  Publish and remove the draft
                </p>
              </label>
            </>
          )}
          <button
            className="btn btn-full  btn-normal"
            // className={`btn btn-full ${
            //   thumbnailPrev && desc && selectedCategories.length > 0
            //     ? "btn-normal"
            //     : "btn-disabled"
            // }`}
            // disabled={!(thumbnailPrev && desc && selectedCategories.length > 0)}
            onClick={() => Submit(30023)}
          >
            {isLoading ? <LoadingDots /> : "Publish"}
          </button>
          {postKind !== 30024 && (
            <button
              className="btn btn-full  btn-text-red"
              onClick={() => Submit(30024)}
            >
              {isLoading ? <LoadingDots /> : "Save as draft"}
            </button>
          )}
        </div>
      )}
      {screen === 3 && (
        <div
          className="fx-centered fx-col slide-up box-pad-h"
          style={{
            width: "500px",
          }}
        >
          <div className="fit-container fx-scattered fx-stretch fx-wrap">
            <div className="fx-centered fx-col" style={{ flex: "1 1 300px" }}>
              <h4 className="box-marg-s">Successful relays</h4>
              {publishingState.map((relay, index) => {
                if (relay.status)
                  return (
                    <div
                      className="fx-centered fx-start-h"
                      key={`${relay.url}-${index}`}
                    >
                      <div className="">👌🏻</div>
                      <p>{relay.url}</p>
                    </div>
                  );
              })}
            </div>
            <div
              style={{
                height: "100px",
                width: "1px",
                borderRight: "1px solid var(--dim-gray)",
                flex: "1 1 300px",
              }}
            ></div>
            {publishingState.filter((relay) => !relay.status).length > 0 && (
              <div className="fx-centered" style={{ flex: "1 1 300px" }}>
                <h4 className="box-marg-s">Failed relays</h4>
                {publishingState.map((relay, index) => {
                  if (!relay.status)
                    return (
                      <div
                        className="fx-centered fx-start-h"
                        key={`${relay.url}-${index}`}
                      >
                        <div className="p-medium">❌</div>
                        <p className="red-c">{relay.url}</p>
                      </div>
                    );
                })}
              </div>
            )}
          </div>
          <div className="box-pad-v-s fx-centered">
            <button
              className="btn btn-normal"
              onClick={() => navigateTo("/my-articles")}
            >
              Done!
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
