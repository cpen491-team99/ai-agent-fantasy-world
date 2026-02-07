import Image from "next/image";
import { IconButton } from "./button";
import { useMobileScreen } from "../utils";
import ReturnIcon from "../icons/return.svg";
import { useNavigate } from "react-router-dom";
import { Path } from "../constant";
import MaxIcon from "../icons/max.svg";
import MinIcon from "../icons/min.svg";

import "../styles/landing.scss";
import { useAppConfig } from "../store/config";

export function LandingPage() {
  const isMobileScreen = useMobileScreen();
  const navigate = useNavigate();
  const config = useAppConfig();

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
                  title="The Town"
                  onClick={() => navigate(Path.Home)}
                />
              </div>
            </div>
          )}
        </div>

        <div className="window-header-title landing-header-title">
          <div className="window-header-main-title">The Town</div>
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

        {/* Footer Tagline */}
        <section className="landing-footer">
          <p className="landing-footer-text">
            Built with WebLLM • Runs entirely in your browser
          </p>
        </section>
      </div>
    </>
  );
}
