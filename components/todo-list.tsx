'use client';

import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useInView,
  LayoutGroup,
} from 'framer-motion';
import type { Todo, Comment } from '@/lib/types';
import TodoItem from './todo-item';
import { FaChevronDown } from 'react-icons/fa';
import { ReactNode, useRef, useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable, OnDragEndResponder } from '@hello-pangea/dnd';

interface TodoListProps {
  todos: Todo[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAddComment: (todoId: string, comment: Comment) => void;
  onDeleteComment: (todoId: string, commentId: string) => void;
  onReschedule: (id: string, newDate: string) => void;
  onDragEnd: OnDragEndResponder;
}

interface ScrollableColumnProps {
  children: ReactNode;
  label: string;
  isEmpty?: boolean;
}

interface AnimatedTodoItemProps {
  todo: Todo;
  index: number;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAddComment: (todoId: string, comment: Comment) => void;
  onDeleteComment: (todoId: string, commentId: string) => void;
  onReschedule: (id: string, newDate: string) => void;
  isDraggingItem?: boolean;
  isDragActive?: boolean;
}

// Custom component for animated todo items with scale effects as they enter/exit viewport
const AnimatedTodoItem = ({
  todo,
  index,
  onToggle,
  onDelete,
  onAddComment,
  onDeleteComment,
  onReschedule,
  isDraggingItem = false,
  isDragActive = false,
}: AnimatedTodoItemProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    margin: '-15% 0px',
    amount: 0.6, // Trigger when at least 60% of the item is in view
  });

  return (
    <motion.div
      ref={ref}
      // disable layout animations during active drag
      {...(!isDragActive && { layoutId: `todo-${todo.id}` })}
      layout={!isDragActive}
      initial={{ opacity: 0, scale: 0.85, y: 20 }}
      animate={{
        opacity: isDraggingItem ? 1 : isInView ? 1 : 0.3,
        scale: isDraggingItem ? 1 : isInView ? 1 : 0.9,
        y: isDraggingItem ? 0 : isInView ? 0 : 10,
      }}
      exit={{
        opacity: 0,
        scale: 0.85,
        y: -20,
        transition: {
          duration: 0.25,
          ease: [0.4, 0.0, 0.2, 1], // Custom ease curve for smoother exit
        },
      }}
      transition={{
        // disable transition during active drag for pointer latch
        ...(isDraggingItem
          ? { duration: 0 }
          : {
              type: 'spring',
              stiffness: 200,
              damping: 25,
              mass: 1,
              delay: index * 0.02,
              opacity: { duration: 0.2 },
              scale: { duration: 0.3 },
              layout: { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] },
            }),
      }}
      style={{
        transformOrigin: 'center',
        willChange: 'transform, opacity',
        position: 'relative',
        zIndex: isDraggingItem ? 1000 : todo.completed ? 0 : 1,
      }}
      className="transform-gpu" // Hardware acceleration
    >
      <TodoItem
        todo={todo}
        onToggle={onToggle}
        onDelete={onDelete}
        onAddComment={onAddComment}
        onDeleteComment={onDeleteComment}
        onReschedule={onReschedule}
      />
    </motion.div>
  );
};

// Component for the scrollable column with fade effects
const ScrollableColumn = ({
  children,
  label,
  isEmpty = false,
  droppableId,
}: ScrollableColumnProps & { droppableId: string }) => {
  const columnRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  // Scroll indicator handler
  const { scrollYProgress } = useScroll({ container: columnRef });
  const opacity = useTransform(scrollYProgress, [0.95, 1], [1, 0]);

  // Check if there's overflow content
  useEffect(() => {
    const checkOverflow = () => {
      if (columnRef.current) {
        const hasVerticalOverflow = columnRef.current.scrollHeight > columnRef.current.clientHeight;
        setHasOverflow(hasVerticalOverflow);
      }
    };

    // Initial check
    checkOverflow();

    // Set up a resize observer to check when dimensions change
    const resizeObserver = new ResizeObserver(checkOverflow);
    if (columnRef.current) {
      resizeObserver.observe(columnRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [children]);

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      <div className="px-2 py-1 text-sm font-medium text-gray-500 dark:text-gray-400 sticky top-0 z-10 bg-gray-100 dark:bg-[#09090B]">
        {label}
      </div>

      <Droppable droppableId={droppableId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 overflow-y-auto overflow-x-hidden pr-1 scroll-smooth relative min-h-[300px] scrollbar-hide ${snapshot.isDraggingOver ? 'bg-gray-50 dark:bg-gray-900/20' : ''}`}
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {/* Hide webkit scrollbar */}
            <style jsx>{`
              div::-webkit-scrollbar {
                display: none;
              }
            `}</style>

            {/* Top fade gradient */}
            <div className="sticky top-0 left-0 right-0 h-6 bg-gradient-to-b from-gray-100 dark:from-[#09090B] to-transparent z-[5] pointer-events-none"></div>

            {/* Content with spacing */}
            <div className="relative z-[1] flex flex-col gap-2">
              {children}
              {provided.placeholder}
            </div>

            {/* Bottom fade gradient */}
            <div className="sticky bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-gray-100 dark:from-[#09090B] to-transparent z-[5] pointer-events-none"></div>

            {/* Scroll indicator - only shows if there are todos AND there's overflow */}
            {!isEmpty && hasOverflow && (
              <motion.div
                style={{ opacity }}
                className="absolute bottom-1 left-1/2 -translate-x-1/2 animate-bounce text-gray-400 z-10 pointer-events-none"
              >
                <FaChevronDown className="h-4 w-4" />
              </motion.div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default function TodoList({
  todos,
  onToggle,
  onDelete,
  onAddComment,
  onDeleteComment,
  onReschedule,
  onDragEnd,
}: TodoListProps) {
  // track global drag state to disable layout animations
  const [dragActive, setDragActive] = useState(false);

  if (todos.length === 0) {
    return null;
  }

  // Sort helper: by due date (earliest first), tasks without dueDate go last
  const sortByDueDate = (a: Todo, b: Todo) => {
    const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    return aTime - bTime;
  };

  // Group todos into columns by due date:
  // columnCount === 1: sort all
  // columnCount === 2: 0=overdue or today, 1=rest
  // columnCount === 3: 0=overdue/today, 1=next 7 days, 2=rest
  const getColumnTodos = (columnIndex: number, columnCount: number) => {
    if (columnCount === 1) {
      return [...todos].sort(sortByDueDate);
    }
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // map todos to include diffDays and group
    const enriched = todos.map((todo) => {
      let diffDays: number;
      if (todo.dueDate) {
        const due = new Date(todo.dueDate);
        const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
        diffDays = Math.floor((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      } else {
        diffDays = Infinity;
      }
      let group = columnCount - 1;
      if (diffDays <= 0) group = 0;
      else if (columnCount === 3 && diffDays >= 1 && diffDays <= 7) group = 1;
      return { todo, diffDays, group };
    });
    // filter by column group
    const bucket = enriched.filter((x) => x.group === columnIndex);
    // for first column (overdue/today), show today's tasks above overdue
    if (columnIndex === 0 && columnCount >= 2) {
      const todayTasks = bucket
        .filter((x) => x.diffDays === 0)
        .map((x) => x.todo)
        .sort(sortByDueDate);
      const overdueTasks = bucket
        .filter((x) => x.diffDays < 0)
        .map((x) => x.todo)
        .sort(sortByDueDate);
      return [...todayTasks, ...overdueTasks];
    }
    // otherwise, just sort by dueDate
    return bucket.map((x) => x.todo).sort(sortByDueDate);
  };

  // JSX for rendering todos in a column with enhanced animations
  const renderTodos = (todos: Todo[], columnId: string) => (
    <LayoutGroup id={`column-${columnId}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        {todos.map((todo, index) => (
          <Draggable key={todo.id} draggableId={todo.id} index={index}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
                style={{
                  ...provided.draggableProps.style,
                  opacity: snapshot.isDragging ? 0.8 : 1,
                }}
              >
                <AnimatedTodoItem
                  todo={todo}
                  index={index}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onAddComment={onAddComment}
                  onDeleteComment={onDeleteComment}
                  onReschedule={onReschedule}
                  isDraggingItem={snapshot.isDragging}
                  isDragActive={dragActive}
                />
              </div>
            )}
          </Draggable>
        ))}
      </AnimatePresence>
    </LayoutGroup>
  );

  return (
    <DragDropContext
      onDragStart={() => setDragActive(true)}
      onDragEnd={(result, provided) => {
        setDragActive(false);
        onDragEnd(result, provided);
      }}
    >
      <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-280px)]">
        {/* Mobile: Single Column */}
        <div className="flex flex-col gap-2 w-full md:hidden h-full">
          <ScrollableColumn
            label={`All Tasks (${getColumnTodos(0, 1).length})`}
            isEmpty={getColumnTodos(0, 1).length === 0}
            droppableId="mobile-column"
          >
            {renderTodos(getColumnTodos(0, 1), 'mobile')}
          </ScrollableColumn>
        </div>

        {/* Tablet: Two Columns */}
        <div className="hidden md:flex lg:hidden gap-4 w-full h-full">
          {([0, 1] as const).map((columnIndex) => {
            const colTodos = getColumnTodos(columnIndex, 2);
            const label =
              columnIndex === 0
                ? `Due Today & Overdue (${colTodos.length})`
                : `Upcoming (${colTodos.length})`;
            return (
              <ScrollableColumn
                key={columnIndex}
                label={label}
                isEmpty={colTodos.length === 0}
                droppableId={`tablet-column-${columnIndex}`}
              >
                {renderTodos(colTodos, `tablet-${columnIndex}`)}
              </ScrollableColumn>
            );
          })}
        </div>

        {/* Desktop: Three Columns */}
        <div className="hidden lg:flex gap-4 w-full h-full">
          {([0, 1, 2] as const).map((columnIndex) => {
            const colTodos = getColumnTodos(columnIndex, 3);
            const label =
              columnIndex === 0
                ? `Today & Overdue (${colTodos.length})`
                : columnIndex === 1
                  ? `Next 7 Days (${colTodos.length})`
                  : `Upcoming (${colTodos.length})`;
            return (
              <ScrollableColumn
                key={columnIndex}
                label={label}
                isEmpty={colTodos.length === 0}
                droppableId={`desktop-column-${columnIndex}`}
              >
                {renderTodos(colTodos, `desktop-${columnIndex}`)}
              </ScrollableColumn>
            );
          })}
        </div>
      </div>
    </DragDropContext>
  );
}
