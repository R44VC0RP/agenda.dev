"use client"

import { motion, AnimatePresence, useScroll, useTransform, useInView, LayoutGroup } from "framer-motion"
import type { Todo, Comment } from "@/lib/types"
import TodoItem from "./todo-item"
import { FaChevronDown } from "react-icons/fa"
import { ReactNode, useRef, useEffect, useState, useCallback } from "react"
import { DragDropContext, Droppable, Draggable, DropResult, OnDragEndResponder } from '@hello-pangea/dnd'
import React from "react"

interface TodoListProps {
  todos: Todo[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onAddComment: (todoId: string, comment: Comment) => void
  onDeleteComment: (todoId: string, commentId: string) => void
  onReschedule: (id: string, newDate: string) => void
  onDragEnd: OnDragEndResponder
  disableDrag?: boolean
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
const AnimatedTodoItem = React.memo(({ 
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
    margin: "-15% 0px",
    amount: 0.6 // Trigger when at least 60% of the item is in view
  });
  
  return (
    <motion.div
      ref={ref}
      // Completely disable layout animations during active drag to prevent jitter
      {...(!isDragActive && !isDraggingItem && { layoutId: `todo-${todo.id}` })}
      layout={!isDragActive && !isDraggingItem}
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{
        // Simplified animations during drag to reduce jitter
        opacity: isDraggingItem ? 1 : isInView ? 1 : 0.4,
        scale: isInView ? 1 : 0.95, // Remove scale effect when dragging
        y: isDraggingItem ? 0 : isInView ? 0 : 5,
        // Remove glow effect when dragging
      }}
      exit={{ 
        opacity: 0, 
        scale: 0.9, 
        y: -10,
        transition: {
          duration: 0.2,
          ease: [0.4, 0.0, 0.2, 1]
        }
      }}
      transition={{
        // Simplified transitions for smoother performance
        ...(isDraggingItem || isDragActive
          ? { 
              duration: 0.15, // Faster transitions during drag
              ease: "easeOut"
            }
          : {
              type: 'spring',
              stiffness: 300, // Increased stiffness for snappier feel
              damping: 30,
              mass: 0.8, // Reduced mass for faster animations
              delay: index * 0.01, // Reduced delay
              opacity: { duration: 0.15 },
              scale: { duration: 0.2 },
            }
        ),
      }}
      style={{
        transformOrigin: "center",
        willChange: isDraggingItem ? "transform, opacity" : "transform, opacity",
        position: "relative",
        zIndex: isDraggingItem ? 1000 : todo.completed ? 0 : 1,
        // Hardware acceleration
        transform: isDraggingItem ? "translateZ(0)" : undefined,
      }}
      className={`transform-gpu ${isDraggingItem ? 'cursor-grabbing' : 'cursor-grab'}`}
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
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  // Only re-render if essential props have changed
  return (
    prevProps.todo.id === nextProps.todo.id &&
    prevProps.todo.title === nextProps.todo.title &&
    prevProps.todo.completed === nextProps.todo.completed &&
    prevProps.todo.dueDate === nextProps.todo.dueDate &&
    prevProps.todo.urgency === nextProps.todo.urgency &&
    prevProps.isDraggingItem === nextProps.isDraggingItem &&
    prevProps.isDragActive === nextProps.isDragActive &&
    prevProps.index === nextProps.index
  );
});

// Component for the scrollable column with fade effects
const ScrollableColumn = ({ children, label, isEmpty = false, droppableId }: ScrollableColumnProps & { droppableId: string }) => {
  const columnRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  
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
  
  // Scroll indicator handler
  const { scrollYProgress } = useScroll({ container: columnRef });
  const opacity = useTransform(scrollYProgress, [0.95, 1], [1, 0]);
  
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
            className="flex-1 overflow-y-auto overflow-x-hidden pr-1 scroll-smooth relative min-h-[300px] scrollbar-hide"
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
            
            {/* Improved drop zone indicator with smooth transition */}
            <motion.div
              initial={false}
              animate={{
                backgroundColor: snapshot.isDraggingOver 
                  ? 'rgba(124, 90, 255, 0.04)'
                  : 'transparent',
                borderColor: snapshot.isDraggingOver
                  ? 'rgba(124, 90, 255, 0.2)'
                  : 'transparent',
              }}
              transition={{
                duration: 0.2,
                ease: "easeOut"
              }}
              className="absolute inset-0 border-2 border-dashed rounded-lg pointer-events-none z-[2]"
            />
            
            {/* Top fade gradient */}
            <div className="sticky top-0 left-0 right-0 h-6 bg-gradient-to-b from-gray-100 dark:from-[#09090B] to-transparent z-[5] pointer-events-none"></div>
            
            {/* Content with spacing */}
            <div className="relative z-[1] flex flex-col gap-2">
              {children}
              {provided.placeholder}
              
              {/* Show helpful text when dragging over empty column */}
              {snapshot.isDraggingOver && isEmpty && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-center h-24 text-sm text-gray-400 dark:text-gray-500 font-medium"
                >
                  Drop here to add to this column
                </motion.div>
              )}
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

// Non-draggable version of ScrollableColumn
const StaticColumn = ({ 
  children, 
  label, 
  isEmpty = false 
}: {
  children: ReactNode;
  label: string;
  isEmpty?: boolean;
}) => {
  const columnRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  
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
  
  // Scroll indicator handler
  const { scrollYProgress } = useScroll({ container: columnRef });
  const opacity = useTransform(scrollYProgress, [0.95, 1], [1, 0]);
  
  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      <div className="px-2 py-1 text-sm font-medium text-gray-500 dark:text-gray-400 sticky top-0 z-10 bg-gray-100 dark:bg-[#09090B]">
        {label}
      </div>
      
      <div 
        ref={columnRef}
        className="flex-1 overflow-y-auto overflow-x-hidden pr-1 scroll-smooth relative min-h-[300px] scrollbar-hide"
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
        </div>
        
        {/* Bottom fade gradient */}
        <div className="sticky bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-gray-100 dark:from-[#09090B] to-transparent z-[5] pointer-events-none"></div>
        
        {/* Scroll indicator - only shows if there are todos AND there's overflow */}
        {/* {!isEmpty && hasOverflow && (
          <motion.div 
            style={{ opacity }}
            className="absolute bottom-1 left-1/2 -translate-x-1/2 animate-bounce text-gray-400 z-10 pointer-events-none"
          >
            <FaChevronDown className="h-4 w-4" />
          </motion.div>
        )} */}
      </div>
    </div>
  );
};

export default function TodoList({ todos, onToggle, onDelete, onAddComment, onDeleteComment, onReschedule, onDragEnd, disableDrag = false }: TodoListProps) {
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
    const enriched = todos.map(todo => {
      let diffDays: number;
      if (todo.dueDate) {
        const due = new Date(todo.dueDate);
        const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
        diffDays = Math.floor((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      } else {
        diffDays = Infinity;
      }
      let group = columnCount - 1;
      // Todos without dates (diffDays = Infinity) or overdue/today go to first column
      if (diffDays === Infinity || diffDays <= 0) group = 0;
      else if (columnCount === 3 && diffDays >= 1 && diffDays <= 7) group = 1;
      return { todo, diffDays, group };
    });
    // filter by column group
    const bucket = enriched.filter(x => x.group === columnIndex);
    // for first column (overdue/today), show tasks without dates first, then today's tasks, then overdue
    if (columnIndex === 0 && columnCount >= 2) {
      const noDateTasks = bucket
        .filter(x => x.diffDays === Infinity)
        .map(x => x.todo)
        .sort((a, b) => a.title.localeCompare(b.title)); // Sort by title for tasks without dates
      const todayTasks = bucket
        .filter(x => x.diffDays === 0)
        .map(x => x.todo)
        .sort(sortByDueDate);
      const overdueTasks = bucket
        .filter(x => x.diffDays < 0)
        .map(x => x.todo)
        .sort(sortByDueDate);
      return [...noDateTasks, ...todayTasks, ...overdueTasks];
    }
    // otherwise, just sort by dueDate
    return bucket.map(x => x.todo).sort(sortByDueDate);
  };

  // Track global drag state to disable layout animations and optimize performance
  const [dragActive, setDragActive] = useState(false);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);

  // Optimized drag handlers with performance improvements
  const handleDragStart = useCallback((result: any) => {
    setDragActive(true);
    setDraggingItemId(result.draggableId);
    // Add subtle haptic feedback on supported devices
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, []);

  const handleDragUpdate = useCallback((update: any) => {
    // Throttle drag updates to reduce re-renders
    // The library handles most of this, but we can optimize our state updates
  }, []);

  const handleDragEndInternal = useCallback((result: any, provided: any) => {
    setDragActive(false);
    setDraggingItemId(null);
    onDragEnd(result, provided);
    // Add completion haptic feedback
    if ('vibrate' in navigator && result.destination) {
      navigator.vibrate([10, 50, 10]);
    }
  }, [onDragEnd]);

  // JSX for rendering todos in a column with enhanced animations
  const renderTodos = (todos: Todo[], columnId: string) => (
    <LayoutGroup id={`column-${columnId}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        {todos.map((todo, index) => (
          disableDrag ? (
            // Non-draggable version for mobile
            <div key={todo.id}>
              <AnimatedTodoItem
                todo={todo}
                index={index}
                onToggle={onToggle}
                onDelete={onDelete}
                onAddComment={onAddComment}
                onDeleteComment={onDeleteComment}
                onReschedule={onReschedule}
                isDragActive={false}
              />
            </div>
          ) : (
            // Draggable version for larger screens
            <Draggable key={todo.id} draggableId={todo.id} index={index}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  style={{
                    ...provided.draggableProps.style,
                    // Clean drag styling without effects
                    zIndex: snapshot.isDragging ? 9999 : 'auto',
                    // Hardware acceleration for smoother movement
                    willChange: snapshot.isDragging ? 'transform' : 'auto',
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
          )
        ))}
      </AnimatePresence>
    </LayoutGroup>
  );

  // If drag is disabled (mobile), render the static version
  if (disableDrag) {
    return (
      <div className="flex flex-col gap-4 h-[calc(100vh-280px)]">
        <StaticColumn 
          label={`All Tasks (${todos.length})`}
          isEmpty={todos.length === 0}
        >
          {renderTodos([...todos].sort(sortByDueDate), "mobile-static")}
        </StaticColumn>
      </div>
    );
  }

  // Return the original drag and drop enabled version for larger screens
  return (
    <DragDropContext
      onDragStart={handleDragStart}
      onDragUpdate={handleDragUpdate}
      onDragEnd={handleDragEndInternal}
    >
      <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-280px)]">
        {/* Mobile: Single Column */}
        <div className="flex flex-col gap-2 w-full md:hidden h-full">
          <ScrollableColumn 
            label={`All Tasks (${getColumnTodos(0, 1).length})`}
            isEmpty={getColumnTodos(0, 1).length === 0}
            droppableId="mobile-column"
          >
            {renderTodos(getColumnTodos(0, 1), "mobile")}
          </ScrollableColumn>
        </div>

        {/* Tablet: Two Columns */}
        <div className="hidden md:flex lg:hidden gap-4 w-full h-full">
          {([0, 1] as const).map((columnIndex) => {
            const colTodos = getColumnTodos(columnIndex, 2);
            const label = columnIndex === 0 ? `Due Today & Overdue (${colTodos.length})` : `Upcoming (${colTodos.length})`;
            return (
              <ScrollableColumn 
                key={columnIndex} 
                label={label}
                isEmpty={colTodos.length === 0}
                droppableId={`tablet-column-${columnIndex}`}
              >
                {renderTodos(colTodos, `tablet-${columnIndex}`)}
              </ScrollableColumn>
            )
          })}
        </div>

        {/* Desktop: Three Columns */}
        <div className="hidden lg:flex gap-4 w-full h-full">
          {([0, 1, 2] as const).map((columnIndex) => {
            const colTodos = getColumnTodos(columnIndex, 3);
            const label = columnIndex === 0
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
            )
          })}
        </div>
      </div>
    </DragDropContext>
  );
}
