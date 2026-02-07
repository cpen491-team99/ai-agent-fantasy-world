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

const ROOM_PRESENTATION: Record<string, { title: string; roomLogo: string }> = {
  library: { title: "Library", roomLogo: "1f680" },
  cafe: { title: "Cafe", roomLogo: "1f4a1" },
  park: { title: "Park", roomLogo: "1f3de-fe0f" },
  "sports-court": { title: "Sports Court", roomLogo: "26bd" },
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
      {(provided) => (
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
          title={`${props.title}\n${Locale.ChatItem.ChatItemCount(
            props.count,
          )}`}
        >
          {props.narrow ? (
            <div className={styles["chat-item-narrow"]}>
              <div className={styles["chat-item-avatar"] + " no-dark"}>
                <TemplateAvatar
                  avatar={props.roomLogo}
                  model={config.modelConfig.model}
                />
              </div>
              <div className={styles["chat-item-narrow-count"]}>
                {props.count}
              </div>
            </div>
          ) : (
            <>
              <div className={styles["chat-item-header"]}>
                <div className={styles["chat-item-avatar"] + " no-dark"}>
                  <TemplateAvatar
                    avatar={props.roomLogo}
                    model={config.modelConfig.model}
                  />
                </div>
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
      )}
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
            {rooms.map(
              (item, i) => {
                const meta = ROOM_PRESENTATION[item.id];
                const title =
                  meta?.title ??
                  (item.topic
                    ? item.topic.toUpperCase()
                    : item.id.toUpperCase());

                // IMPORTANT: choose a safe fallback avatar key that TemplateAvatar definitely supports.
                // If you're not sure, temporarily hardcode one that you know works from the old app (e.g. "chat").
                const roomLogo = meta?.roomLogo ?? item.roomLogo ?? "chat";

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
                      navigate(Path.Chat);
                      dispatch(setCurrentRoomId(item.id));
                    }}
                    narrow={props.narrow}
                    roomLogo={roomLogo}
                  />
                );
              },
              //   (
              //   <ChatItem
              //     title={item.topic}
              //     time={new Date(item.lastUpdate).toLocaleString()}
              //     count={item.messages.length ?? 0}
              //     key={item.id}
              //     id={item.id}
              //     index={i}
              //     selected={i === selectedIndex}
              //     onClick={() => {
              //       navigate(Path.Chat);
              //       dispatch(setCurrentRoomId(item.id));
              //     }}
              //     narrow={props.narrow}
              //     roomLogo={item.roomLogo}
              //   />
              // )
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
