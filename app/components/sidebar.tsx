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
import PawIcon from "../icons/paw-print.svg";
import GoogleIcon from "../icons/google.svg";

import Locale from "../locales";

import {
  openLogoutModal,
  openLoginModal,
  openAgentSelectionModal,
} from "../redux/authSlice";
import { useRequireAuth } from "./auth/useRequireAuth";

import { Theme, useAppConfig } from "../store/config";
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

import FoxImg from "../assets/agents/fox.png";
import BunnyImg from "../assets/agents/bunny.png";
import RaccoonImg from "../assets/agents/raccoon.png";
import MouseImg from "../assets/agents/mouse.png";
import DefaultImg from "../assets/agents/default.png";

const AGENT_IMAGE_MAP: Record<string, string> = {
  "fox.png": FoxImg.src,
  "bunny.png": BunnyImg.src,
  "raccoon.png": RaccoonImg.src,
  "mouse.png": MouseImg.src,
};

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
    startX.current = e.clientX;
    startDragWidth.current = config.sidebarWidth;
    const dragStartTime = Date.now();

    const handleDragMove = (e: MouseEvent) => {
      if (Date.now() < lastUpdateTime.current + 20) return;
      lastUpdateTime.current = Date.now();
      const d = e.clientX - startX.current;
      const nextWidth = limit(startDragWidth.current + d);
      config.update((config) => {
        config.sidebarWidth =
          nextWidth < MIN_SIDEBAR_WIDTH ? NARROW_SIDEBAR_WIDTH : nextWidth;
      });
    };

    const handleDragEnd = () => {
      window.removeEventListener("pointermove", handleDragMove);
      window.removeEventListener("pointerup", handleDragEnd);
      if (Date.now() - dragStartTime < 300) toggleSideBar();
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

  return { onDragStart, shouldNarrow };
}

export function SideBar(props: { className?: string }) {
  const dispatch = useAppDispatch();
  const chatroomsState = useAppSelector((state) => state.chatrooms);
  const auth = useAppSelector((state) => state.auth);
  const { requireAuth } = useRequireAuth();

  const [showReduxState, setShowReduxState] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const activeUserAgent = auth.activeUserAgent;
  const activeAgentImage =
    AGENT_IMAGE_MAP[activeUserAgent?.imageId ?? ""] ?? DefaultImg.src;

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
  const themeOptions = [
    { id: Theme.Light, label: "Light", icon: <LightIcon /> },
    { id: Theme.Midnight, label: "Midnight", icon: <DarkIcon /> },
    { id: Theme.Forest, label: "Forest", icon: <PawIcon /> },
    { id: Theme.Cyberpunk, label: "Cyberpunk", icon: <InternetIcon /> },
    { id: Theme.Gameboy, label: "GameBoy", icon: <DragIcon /> },
    { id: Theme.Vampire, label: "Vampire", icon: <DarkIcon /> },
  ];

  return (
    <div
      className={`${styles.sidebar} ${props.className} ${shouldNarrow && styles["narrow-sidebar"]}`}
      style={{ transition: isMobileScreen && isIOSMobile ? "none" : undefined }}
    >
      <div className={styles["sidebar-header"]}>
        <div className={styles["sidebar-title-container"]}>
          <div className={styles["sidebar-title"]}>{Locale.Title}</div>
          <div className={styles["sidebar-sub-title"]}>{Locale.Subtitle}</div>
        </div>
      </div>

      <div className={styles["sidebar-header-bar"]}>
        <IconButton
          icon={<TemplateIcon />}
          text={shouldNarrow ? undefined : Locale.Template.Name}
          className={styles["sidebar-bar-button"]}
          onClick={() => {
            requireAuth(() => {
              navigate(Path.MyAgent, { state: { fromHome: true } });
            });
          }}
          shadow
        />
        <IconButton
          icon={<SettingsIcon />}
          text={shouldNarrow ? undefined : Locale.Settings.Title}
          className={styles["sidebar-bar-button"]}
          onClick={() => navigate(Path.Settings)}
          shadow
        />
      </div>

      <div
        className={styles["sidebar-body"]}
        onClick={(e) => e.target === e.currentTarget && navigate(Path.Home)}
      >
        <ChatList narrow={shouldNarrow} />
      </div>

      {!shouldNarrow && (
        <div className={styles["redux-panel"]}>
          <button
            className={styles["redux-panel-header"]}
            type="button"
            onClick={() => setShowReduxState((v) => !v)}
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
            <div className={styles["theme-selector"]}>
              <IconButton
                icon={
                  <>
                    {theme === Theme.Light && <LightIcon />}
                    {theme === Theme.Midnight && <DarkIcon />}
                    {theme === Theme.Forest && <PawIcon />}
                    {theme === Theme.Cyberpunk && <InternetIcon />}
                    {theme === Theme.Gameboy && <DragIcon />}
                    {theme === Theme.Vampire && <DarkIcon />}
                  </>
                }
                onClick={() => setShowThemeMenu((v) => !v)}
                shadow
              />
              {showThemeMenu && (
                <div className={styles["theme-menu"]}>
                  {themeOptions.map((opt) => (
                    <button
                      key={opt.id}
                      className={`${styles["theme-menu-item"]} ${opt.id === theme ? styles["theme-menu-item-active"] : ""}`}
                      onClick={() => {
                        config.update((c) => (c.theme = opt.id));
                        setShowThemeMenu(false);
                      }}
                    >
                      <div className={styles["theme-menu-icon"]}>
                        {opt.icon}
                      </div>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={styles["sidebar-action"]}>
            <IconButton
              icon={<GoogleIcon />}
              onClick={() =>
                dispatch(auth.isLoggedIn ? openLogoutModal() : openLoginModal())
              }
              shadow
              title={auth.isLoggedIn ? "Logout" : "Login"}
            />
          </div>

          <div className={styles["sidebar-action"]}>
            <IconButton
              icon={
                activeUserAgent ? (
                  <img
                    src={activeAgentImage}
                    alt={activeUserAgent.name}
                    className={styles["agent-icon-image"]}
                  />
                ) : (
                  <PawIcon />
                )
              }
              onClick={() => {
                if (!auth.isLoggedIn) {
                  dispatch(openLoginModal());
                } else if (!activeUserAgent) {
                  dispatch(openAgentSelectionModal());
                }
              }}
              shadow
              title={
                !auth.isLoggedIn
                  ? "Login to choose agent"
                  : activeUserAgent?.name || "Choose Agent"
              }
            />
          </div>
        </div>
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
