import styles from "./home.module.scss";
import {
  DragDropContext,
  Droppable,
  Draggable,
  OnDragEndResponder,
} from "@hello-pangea/dnd";

import { useAppConfig } from "../store";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { moveRoom, setCurrentRoomId } from "../redux/chatroomsSlice";

import Locale from "../locales";
import { useLocation, useNavigate } from "react-router-dom";
import { Path } from "../constant";
import { TemplateAvatar } from "./template";
import { useRef, useEffect } from "react";
import { useRequireAuth } from "./auth/useRequireAuth";

//Rooms Bg Change
import PalaceBg from "../assets/rooms/palace.jpg";
import SquareBg from "../assets/rooms/square.jpg";
import WoodsBg from "../assets/rooms/woods.jpg";
import PubBg from "../assets/rooms/pub.jpg";

export const ROOM_PRESENTATION: Record<
  string,
  { title: string; roomLogo: string }
> = {
  palace: { title: "Seralith's Palace", roomLogo: "1f680" },
  square: { title: "Bergamont Square", roomLogo: "1f4a1" },
  woods: { title: "Redberry Woods", roomLogo: "1f3de-fe0f" },
  pub: { title: "Toad & Tankard", roomLogo: "26bd" },
};

// Place the actual image files under /public/rooms/<id>.jpg or adjust paths.
const ROOM_BACKGROUNDS: Record<string, string> = {
  palace: PalaceBg.src,
  square: SquareBg.src,
  woods: WoodsBg.src,
  pub: PubBg.src,
};

export function ChatItem(props: {
  onClick?: () => void;
  title: string;
  count: number;
  time: string;
  selected: boolean;
  id: string;
  index: number;
  narrow?: boolean;
  roomLogo: string;
  backgroundUrl?: string;
}) {
  const config = useAppConfig();
  const draggableRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (props.selected && draggableRef.current) {
      draggableRef.current?.scrollIntoView({
        block: "center",
      });
    }
  }, [props.selected]);

  const { pathname: currentPath } = useLocation();
  return (
    <Draggable draggableId={`${props.id}`} index={props.index}>
      {(provided) => {
        const draggableStyle = provided.draggableProps.style;
        const mergedStyle = props.backgroundUrl
          ? ({
              ...draggableStyle,
              ["--room-bg" as any]: `url(${props.backgroundUrl})`,
            } as React.CSSProperties)
          : draggableStyle;

        return (
          <div
            className={`${styles["chat-item"]} ${
              props.selected &&
              (currentPath === Path.Chat || currentPath === Path.Home) &&
              styles["chat-item-selected"]
            }`}
            onClick={props.onClick}
            ref={(ele) => {
              draggableRef.current = ele;
              provided.innerRef(ele);
            }}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={mergedStyle}
            title={`${props.title}\n${Locale.ChatItem.ChatItemCount(
              props.count,
            )}`}
          >
            {props.narrow ? (
              <div className={styles["chat-item-narrow"]}>
                <div className={styles["chat-item-narrow-count"]}>
                  {props.count}
                </div>
              </div>
            ) : (
              <>
                <div className={styles["chat-item-header"]}>
                  <div className={styles["chat-item-title"]}>{props.title}</div>
                </div>
                <div className={styles["chat-item-info"]}>
                  {/* <div className={styles["chat-item-count"]}>
                  {Locale.ChatItem.ChatItemCount(props.count)}
                </div> */}
                  {/* <div className={styles["chat-item-date"]}>{props.time}</div> */}
                </div>
              </>
            )}
          </div>
        );
      }}
    </Draggable>
  );
}

export function ChatList(props: { narrow?: boolean }) {
  const dispatch = useAppDispatch();
  const rooms = useAppSelector((state) => state.chatrooms.rooms);
  const currentRoomId = useAppSelector(
    (state) => state.chatrooms.currentRoomId,
  );
  const selectedIndex = rooms.findIndex((room) => room.id === currentRoomId);
  const navigate = useNavigate();
  const { requireAuth } = useRequireAuth();

  const onDragEnd: OnDragEndResponder = (result) => {
    const { destination, source } = result;
    if (!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    dispatch(moveRoom({ from: source.index, to: destination.index }));
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="chat-list">
        {(provided) => (
          <div
            className={styles["chat-list"]}
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {rooms.map((item, i) => {
              const meta = ROOM_PRESENTATION[item.id];
              const title =
                meta?.title ??
                (item.topic ? item.topic.toUpperCase() : item.id.toUpperCase());

              // IMPORTANT: choose a safe fallback avatar key that TemplateAvatar definitely supports.
              // If you're not sure, temporarily hardcode one that you know works from the old app (e.g. "chat").
              const roomLogo = meta?.roomLogo ?? item.roomLogo ?? "chat";

              const backgroundUrl = ROOM_BACKGROUNDS[item.id];

              return (
                <ChatItem
                  title={title}
                  time={new Date(item.lastUpdate).toLocaleString()}
                  count={item.messages.length ?? 0}
                  key={item.id}
                  id={item.id}
                  index={i}
                  selected={i === selectedIndex}
                  onClick={() => {
                    requireAuth(() => {
                      dispatch(setCurrentRoomId(item.id));
                      navigate(Path.Chat);
                    });
                  }}
                  narrow={props.narrow}
                  roomLogo={roomLogo}
                  backgroundUrl={backgroundUrl}
                />
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
