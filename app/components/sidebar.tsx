import { useEffect, useRef, useMemo, useState } from "react";

import styles from "./home.module.scss";

import { IconButton } from "./button";
import SettingsIcon from "../icons/gear.svg";
import GithubIcon from "../icons/github.svg";
import InternetIcon from "../icons/internet.svg";
import TemplateIcon from "../icons/chat.svg";
import DragIcon from "../icons/drag.svg";
import LightIcon from "../icons/light.svg";
import DarkIcon from "../icons/dark.svg";
import AutoIcon from "../icons/auto.svg";
import PawIcon from "../icons/paw-print.svg";

import Locale from "../locales";

import { Theme, useAppConfig } from "../store";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import {
  setCurrentRoomId,
  setCurrentUserAgentId,
} from "../redux/chatroomsSlice";

import {
  DEFAULT_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  NARROW_SIDEBAR_WIDTH,
  Path,
  REPO_URL,
  WEBLLM_HOME_URL,
} from "../constant";

import { useNavigate } from "react-router-dom";
import { isIOS, useMobileScreen } from "../utils";
import dynamic from "next/dynamic";
import { showToast } from "./ui-lib";

const ChatList = dynamic(async () => (await import("./chat-list")).ChatList, {
  loading: () => null,
});

function useHotKey() {
  const dispatch = useAppDispatch();
  const rooms = useAppSelector((state) => state.chatrooms.rooms);
  const currentRoomId = useAppSelector(
    (state) => state.chatrooms.currentRoomId,
  );
  const currentIndex = rooms.findIndex((room) => room.id === currentRoomId);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey) {
        if (e.key === "ArrowUp") {
          const nextIndex = Math.max(0, currentIndex - 1);
          const nextRoom = rooms[nextIndex];
          if (nextRoom) {
            dispatch(setCurrentRoomId(nextRoom.id));
          }
        } else if (e.key === "ArrowDown") {
          const nextIndex = Math.min(rooms.length - 1, currentIndex + 1);
          const nextRoom = rooms[nextIndex];
          if (nextRoom) {
            dispatch(setCurrentRoomId(nextRoom.id));
          }
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentIndex, dispatch, rooms]);
}

function useDragSideBar() {
  const limit = (x: number) => Math.min(MAX_SIDEBAR_WIDTH, x);

  const config = useAppConfig();
  const startX = useRef(0);
  const startDragWidth = useRef(config.sidebarWidth ?? DEFAULT_SIDEBAR_WIDTH);
  const lastUpdateTime = useRef(Date.now());

  const toggleSideBar = () => {
    config.update((config) => {
      if (config.sidebarWidth < MIN_SIDEBAR_WIDTH) {
        config.sidebarWidth = DEFAULT_SIDEBAR_WIDTH;
      } else {
        config.sidebarWidth = NARROW_SIDEBAR_WIDTH;
      }
    });
  };

  const onDragStart = (e: MouseEvent) => {
    // Remembers the initial width each time the mouse is pressed
    startX.current = e.clientX;
    startDragWidth.current = config.sidebarWidth;
    const dragStartTime = Date.now();

    const handleDragMove = (e: MouseEvent) => {
      if (Date.now() < lastUpdateTime.current + 20) {
        return;
      }
      lastUpdateTime.current = Date.now();
      const d = e.clientX - startX.current;
      const nextWidth = limit(startDragWidth.current + d);
      config.update((config) => {
        if (nextWidth < MIN_SIDEBAR_WIDTH) {
          config.sidebarWidth = NARROW_SIDEBAR_WIDTH;
        } else {
          config.sidebarWidth = nextWidth;
        }
      });
    };

    const handleDragEnd = () => {
      // In useRef the data is non-responsive, so `config.sidebarWidth` can't get the dynamic sidebarWidth
      window.removeEventListener("pointermove", handleDragMove);
      window.removeEventListener("pointerup", handleDragEnd);

      // if user click the drag icon, should toggle the sidebar
      const shouldFireClick = Date.now() - dragStartTime < 300;
      if (shouldFireClick) {
        toggleSideBar();
      }
    };

    window.addEventListener("pointermove", handleDragMove);
    window.addEventListener("pointerup", handleDragEnd);
  };

  const isMobileScreen = useMobileScreen();
  const shouldNarrow =
    !isMobileScreen && config.sidebarWidth < MIN_SIDEBAR_WIDTH;

  useEffect(() => {
    const barWidth = shouldNarrow
      ? NARROW_SIDEBAR_WIDTH
      : limit(config.sidebarWidth ?? DEFAULT_SIDEBAR_WIDTH);
    const sideBarWidth = isMobileScreen ? "100vw" : `${barWidth}px`;
    document.documentElement.style.setProperty("--sidebar-width", sideBarWidth);
  }, [config.sidebarWidth, isMobileScreen, shouldNarrow]);

  return {
    onDragStart,
    shouldNarrow,
  };
}

export function SideBar(props: { className?: string }) {
  const dispatch = useAppDispatch();
  const rooms = useAppSelector((state) => state.chatrooms.rooms);
  const chatroomsState = useAppSelector((state) => state.chatrooms);
  const currentUserAgentId = useAppSelector(
    (state) => state.chatrooms.currentUserAgentId,
  );
  const [showReduxState, setShowReduxState] = useState(false);
  const [showAgentMenu, setShowAgentMenu] = useState(false);

  // drag side bar
  const { onDragStart, shouldNarrow } = useDragSideBar();
  const navigate = useNavigate();
  const config = useAppConfig();
  const isMobileScreen = useMobileScreen();
  const isIOSMobile = useMemo(
    () => isIOS() && isMobileScreen,
    [isMobileScreen],
  );
  useHotKey();

  const { theme } = config;
  function nextTheme() {
    const themes = [Theme.Auto, Theme.Light, Theme.Dark];
    const themeIndex = themes.indexOf(theme);
    const nextIndex = (themeIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex];
    config.update((config) => (config.theme = nextTheme));
  }

  // Sample user myAgent selection menu. For the future, Each user will have their own unique lists of agents to choose from.
  const agentOptions = [
    { id: "raccoon", label: "Raccoon" },
    { id: "fox", label: "Fox" },
    { id: "bunny", label: "Bunny" },
    { id: "cat", label: "Cat" },
    { id: "dog", label: "Dog" },
  ];

  return (
    <div
      className={`${styles.sidebar} ${props.className} ${
        shouldNarrow && styles["narrow-sidebar"]
      }`}
      style={{
        // #3016 disable transition on ios mobile screen
        transition: isMobileScreen && isIOSMobile ? "none" : undefined,
      }}
    >
      <div className={styles["sidebar-header"]}>
        <div className={styles["sidebar-title-container"]}>
          <div className={styles["sidebar-title"]}>{Locale.Title}</div>
          <div className={styles["sidebar-sub-title"]}>{Locale.Subtitle}</div>
        </div>
        <div className={styles["sidebar-logo"] + " no-dark mlc-icon"}>
          {/* <MlcIcon /> */}
        </div>
      </div>

      <div className={styles["sidebar-header-bar"]}>
        <IconButton
          icon={<TemplateIcon />}
          text={shouldNarrow ? undefined : Locale.Template.Name}
          className={styles["sidebar-bar-button"]}
          onClick={() => {
            navigate(Path.MyAgent, { state: { fromHome: true } });
          }}
          shadow
        />
        <IconButton
          icon={<SettingsIcon />}
          text={shouldNarrow ? undefined : Locale.Settings.Title}
          className={styles["sidebar-bar-button"]}
          onClick={() => {
            navigate(Path.Settings);
          }}
          shadow
        />
      </div>

      <div
        className={styles["sidebar-body"]}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            navigate(Path.Home);
          }
        }}
      >
        <ChatList narrow={shouldNarrow} />
      </div>

      {/* For redux testing */}
      {!shouldNarrow && (
        <div className={styles["redux-panel"]}>
          <button
            className={styles["redux-panel-header"]}
            type="button"
            onClick={() => setShowReduxState((prev) => !prev)}
          >
            {showReduxState ? "Hide" : "Show"} Redux State
          </button>
          {showReduxState && (
            <pre className={styles["redux-panel-body"]}>
              {JSON.stringify(chatroomsState, null, 2)}
            </pre>
          )}
        </div>
      )}
      {/*End  For redux testing */}

      <div className={styles["sidebar-tail"]}>
        <div className={styles["sidebar-actions"]}>
          <div className={styles["sidebar-action"]}>
            <a href={WEBLLM_HOME_URL} target="_blank" rel="noopener noreferrer">
              <IconButton icon={<InternetIcon />} shadow />
            </a>
          </div>
          <div className={styles["sidebar-action"]}>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
              <IconButton icon={<GithubIcon />} shadow />
            </a>
          </div>
          <div className={styles["sidebar-action"]}>
            <IconButton
              icon={
                <>
                  {theme === Theme.Auto ? (
                    <AutoIcon />
                  ) : theme === Theme.Light ? (
                    <LightIcon />
                  ) : theme === Theme.Dark ? (
                    <DarkIcon />
                  ) : null}
                </>
              }
              onClick={nextTheme}
              shadow
            />
          </div>
          <div className={styles["sidebar-action"]}>
            <div className={styles["agent-selector"]}>
              <IconButton
                icon={<PawIcon />}
                onClick={() => setShowAgentMenu((v) => !v)}
                shadow
              />
              {showAgentMenu && (
                <div className={styles["agent-menu"]}>
                  {agentOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={
                        styles["agent-menu-item"] +
                        (opt.id === currentUserAgentId
                          ? " " + styles["agent-menu-item-active"]
                          : "")
                      }
                      onClick={() => {
                        dispatch(setCurrentUserAgentId(opt.id));
                        setShowAgentMenu(false);
                        showToast?.(`Switched agent to ${opt.label}`);
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        {/* <div>
          <IconButton
            icon={<AddIcon />}
            text={shouldNarrow ? undefined : Locale.Home.NewChat}
            onClick={() => {
              if (rooms[0]) {
                dispatch(setCurrentRoomId(rooms[0].id));
              }
              navigate(Path.Chat);
            }}
            shadow
          />
        </div> */}
      </div>

      <div
        className={styles["sidebar-drag"]}
        onPointerDown={(e) => onDragStart(e as any)}
      >
        <DragIcon />
      </div>
    </div>
  );
}
