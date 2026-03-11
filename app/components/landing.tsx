import Image from "next/image";
import { IconButton } from "./button";
import { useMobileScreen } from "../utils";
import ReturnIcon from "../icons/return.svg";
import { useNavigate } from "react-router-dom";
import { Path } from "../constant";
import MaxIcon from "../icons/max.svg";
import MinIcon from "../icons/min.svg";
import { useEffect, useState } from "react";
import modalStyles from "./home.module.scss";
import { Markdown } from "./markdown";
import StoryImage from "../assets/story.jpg";

import "../styles/landing.scss";
import { useAppConfig } from "../store/config";

export function LandingPage() {
  const isMobileScreen = useMobileScreen();
  const navigate = useNavigate();
  const config = useAppConfig();

  const [isWorldInfoOpen, setWorldInfoOpen] = useState(false);
  const [worldInfoLoading, setWorldInfoLoading] = useState(false);
  const [worldInfoError, setWorldInfoError] = useState<string | null>(null);
  const [worldInfoMd, setWorldInfoMd] = useState<string>("");

  useEffect(() => {
    if (!isWorldInfoOpen) return;
    if (worldInfoMd) return;

    const controller = new AbortController();
    setWorldInfoLoading(true);
    setWorldInfoError(null);

    fetch("/world-info.md", { signal: controller.signal })
      .then((res) => {
        if (!res.ok)
          throw new Error(`Failed to load world-info.md (${res.status})`);
        return res.text();
      })
      .then((md) => setWorldInfoMd(md))
      .catch((err) => {
        if (controller.signal.aborted) return;
        setWorldInfoError(err?.message ?? "Failed to load World Info");
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setWorldInfoLoading(false);
      });

    return () => controller.abort();
  }, [isWorldInfoOpen, worldInfoMd]);

  return (
    <>
      <div className="window-header landing-header">
        <div className="landing-header-left">
          {isMobileScreen && (
            <div className="window-actions">
              <div className="window-action-button">
                <IconButton
                  icon={<ReturnIcon />}
                  bordered
                  title="Honeyveil"
                  onClick={() => navigate(Path.Home)}
                />
              </div>
            </div>
          )}
        </div>

        <div className="window-header-title landing-header-title">
          <div className="window-header-main-title">Honeyveil</div>
        </div>

        <div className="landing-header-right">
          {!isMobileScreen && (
            <div className="window-actions">
              <div className="window-action-button">
                <IconButton
                  icon={config.tightBorder ? <MinIcon /> : <MaxIcon />}
                  bordered
                  onClick={() => {
                    config.update(
                      (config) => (config.tightBorder = !config.tightBorder),
                    );
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="landing-page">
        {/* Hero Section */}
        <section className="landing-hero">
          <div className="landing-hero-badge">✨ AI-Powered Fantasy World</div>
          <h1 className="landing-hero-title">
            Where AI Agents <span className="gradient-text">Come Alive</span>
          </h1>
          <p className="landing-hero-subtitle">
            A self-generating story filled with unique animal characters, each
            with their own personality, memories, and relationships—all running
            locally on your device.
          </p>
        </section>

        {/* Main Visual */}
        <section className="landing-showcase">
          <div className="landing-showcase-card">
            <Image
              src="/landing-town.png"
              alt="A cozy 8-bit pixel-art town with animal residents"
              className="landing-showcase-image"
              width={700}
              height={400}
              priority
            />
            <div className="landing-showcase-glow"></div>
          </div>
        </section>

        {/* Feature Cards */}
        <section className="landing-features">
          <div className="landing-feature-card">
            <div className="landing-feature-icon">🦝</div>
            <h3 className="landing-feature-title">Unique Characters</h3>
            <p className="landing-feature-desc">
              Every resident is an AI agent with distinct mannerisms—raccoons,
              cats, eagles, snakes, and more.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon">💬</div>
            <h3 className="landing-feature-title">Living Conversations</h3>
            <p className="landing-feature-desc">
              Watch agents interact naturally, form opinions, and build
              relationships through genuine dialogue.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon">🧠</div>
            <h3 className="landing-feature-title">Evolving Memories</h3>
            <p className="landing-feature-desc">
              Each agent remembers past interactions and grows from their
              experiences over time.
            </p>
          </div>
        </section>

        {/* Agent Interaction Preview */}
        <section className="landing-preview">
          <div className="landing-preview-content">
            <div className="landing-preview-text">
              <h2 className="landing-preview-title">
                Chat With Your Own Agent
              </h2>
              <p className="landing-preview-desc">
                Get your own animal character and chat with the town&apos;s
                residents. See how they respond to you and form unique memories
                of your encounters.
              </p>
              <div className="landing-preview-tags">
                <span className="landing-tag">Local LLM</span>
                <span className="landing-tag">Privacy-First</span>
                <span className="landing-tag">No LLM API Calls</span>
              </div>
            </div>
            <div className="landing-preview-visual">
              <Image
                src="/landing-agents-talking.png"
                alt="Two pixel-art animal agents chatting"
                className="landing-preview-image"
                width={400}
                height={300}
              />
            </div>
          </div>
        </section>

        {/* About this world: clickable section under the chat preview */}
        <section className="landing-preview">
          <button
            type="button"
            className="landing-preview-content landing-preview-content-clickable"
            onClick={() => setWorldInfoOpen(true)}
          >
            <div className="landing-preview-text">
              <h2 className="landing-preview-title">About Honeyveil</h2>
              <p className="landing-preview-desc">
                Explore the rich story of the mythical kingdom through the lush
                landmarks and vibrant characters.
              </p>
            </div>
            <div className="landing-preview-visual">
              <Image
                src={StoryImage}
                alt="Honeyveil story artwork"
                className="landing-preview-image"
                width={400}
                height={300}
              />
            </div>
          </button>
        </section>

        {/* Footer Tagline */}
        <section className="landing-footer">
          <p className="landing-footer-text">
            Built with WebLLM • Runs entirely in your browser
          </p>
        </section>
      </div>

      {isWorldInfoOpen && (
        <div
          className={modalStyles["world-info-overlay"]}
          onClick={() => setWorldInfoOpen(false)}
          role="presentation"
        >
          <div
            className={modalStyles["world-info-modal"]}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="world-info-title"
          >
            <div className={modalStyles["world-info-header"]}>
              <h2 id="world-info-title">About Honeyveil</h2>
              <button
                type="button"
                className={modalStyles["world-info-close"]}
                onClick={() => setWorldInfoOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className={modalStyles["world-info-body"]}>
              {worldInfoError ? (
                <div className={modalStyles["world-info-text"]}>
                  {worldInfoError}
                </div>
              ) : (
                <Markdown
                  content={worldInfoMd}
                  loading={worldInfoLoading}
                  fontSize={21}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
