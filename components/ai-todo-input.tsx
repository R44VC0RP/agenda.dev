"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { Todo } from "@/lib/types"
import { v4 as uuidv4 } from "uuid"
import { ArrowRight, ChevronLeft, ChevronRight, Calendar, Clock, ArrowUp } from "lucide-react"
import { useSession } from "@/lib/auth-client"
import { IOSpinner } from "./spinner"
import { BorderBeamMask } from "@/components/ui/border-beam-mask"

interface Suggestion {
  type: "date" | "time" | "datetime"
  value: string
  display: string
}

interface AITodoInputProps {
  onAddTodo: (todo: Todo) => void
}

export default function AITodoInput({ onAddTodo }: AITodoInputProps) {
  const [inputValue, setInputValue] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [pendingFields, setPendingFields] = useState<string[]>([])
  const [collectedValues, setCollectedValues] = useState<Record<string, string>>({})
  const [urgency, setUrgency] = useState(3)
  const [conversationId, setConversationId] = useState<string>(() => uuidv4())
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [currentPrompt, setCurrentPrompt] = useState<string>("")
  const [todoTitle, setTodoTitle] = useState<string>("")
  
  const inputRef = useRef<HTMLInputElement>(null)
  const { data: session } = useSession()

  // Focus the input field on first render
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const extractSuggestions = (html: string): Suggestion[] => {
    const suggestionRegex = /<suggestion type="(date|time|datetime)" value="([^"]+)">([^<]+)<\/suggestion>/g
    const matches = [...html.matchAll(suggestionRegex)]
    
    if (matches.length === 0) return []
    
    return matches.map(match => ({
      type: match[1] as "date" | "time" | "datetime",
      value: match[2],
      display: match[3],
    }))
  }
  
  const resetAndFocus = () => {
    setInputValue("")
    setCollectedValues({})
    setPendingFields([])
    setSuggestions([])
    setTodoTitle("")
    setCurrentPrompt("")
    setUrgency(3)
    setConversationId(uuidv4())
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const handleSubmit = async (e?: React.FormEvent, suggestionValue?: string) => {
    if (e) e.preventDefault()
    
    // Don't submit if already processing
    if (isProcessing) return
    
    const valueToSubmit = suggestionValue || inputValue
    
    // Don't submit if empty
    if (!valueToSubmit.trim() && !pendingFields.includes("urgency")) return
    
    // If we're collecting urgency specifically
    if (pendingFields.includes("urgency") && pendingFields.length === 1) {
      await handleFieldSubmit("urgency", urgency.toString())
      return
    }
    
    setIsProcessing(true)
    
    try {
      // Call API route to process the todo
      const response = await fetch("/api/parse-todo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: valueToSubmit,
          conversationId,
          collectedValues,
          pendingFields,
        }),
      })
      
      if (!response.ok) {
        throw new Error("Failed to process todo")
      }
      
      const data = await response.json()
      
      // Extract title if present
      if (data.values?.title && !todoTitle) {
        setTodoTitle(data.values.title)
      }
      
      // Extract suggestions from HTML if any
      const extractedSuggestions = extractSuggestions(data.html || "")
      setSuggestions(extractedSuggestions.length > 0 ? extractedSuggestions : [])
      
      // Set prompt message - use follow_up if available
      setCurrentPrompt(data.text || "")
      
      // Update pending fields
      if (data.stillNeeded && data.stillNeeded.length > 0) {
        setPendingFields(data.stillNeeded)
      } else {
        setPendingFields([])
      }
      
      // Update collected values
      if (data.values) {
        setCollectedValues(prev => ({
          ...prev,
          ...data.values,
        }))
        
        // If we got an urgency, update the urgency state
        if (data.values.urgency) {
          setUrgency(parseFloat(data.values.urgency))
        }
      }
      
      // Check if todo is complete
      if (data.isComplete) {
        // Create and add todo
        const newTodo: Todo = {
          id: uuidv4(),
          title: data.values.title,
          dueDate: validateAndFormatDate(data.values.date),
          urgency: Math.round(parseFloat(data.values.urgency)),
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: session?.user?.id || '',
          comments: [],
          workspaceId: undefined,
        }
        
        onAddTodo(newTodo)
        
        // Reset the form
        setTimeout(resetAndFocus, 500)
      }
    } catch (error) {
      console.error("❌ Error processing todo:", error)
      setCurrentPrompt("Something went wrong. Please try again.")
    } finally {
      setIsProcessing(false)
      setInputValue("")
    }
  }
  
  const handleFieldSubmit = async (field: string, value: string) => {
    setIsProcessing(true)
    
    try {
      const response = await fetch("/api/parse-todo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: value,
          conversationId,
          collectedValues: {
            ...collectedValues,
            [field]: value,
          },
          pendingFields: pendingFields.filter(f => f !== field),
          currentField: field,
        }),
      })
      
      if (!response.ok) {
        throw new Error("Failed to process field")
      }
      
      const data = await response.json()
      
      // Update prompt
      setCurrentPrompt(data.text || `Thanks for providing the ${field}.`)
      
      // Update pending fields
      if (data.stillNeeded && data.stillNeeded.length > 0) {
        setPendingFields(data.stillNeeded)
      } else {
        setPendingFields([])
      }
      
      // Extract suggestions from HTML if any
      const extractedSuggestions = extractSuggestions(data.html || "")
      setSuggestions(extractedSuggestions.length > 0 ? extractedSuggestions : [])
      
      // Update collected values
      if (data.values) {
        setCollectedValues(prev => ({
          ...prev,
          ...data.values,
          [field]: value,
        }))
        
        // If we got an urgency, update the urgency state
        if (data.values.urgency) {
          setUrgency(parseFloat(data.values.urgency))
        }
      }
      
      // Check if todo is complete
      if (data.isComplete) {
        // Create and add todo
        const newTodo: Todo = {
          id: uuidv4(),
          title: data.values.title || collectedValues.title,
          dueDate: validateAndFormatDate(data.values.date || collectedValues.date),
          urgency: Math.round(parseFloat(data.values.urgency || collectedValues.urgency)),
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: session?.user?.id || '',
          comments: [],
          workspaceId: undefined,
        }
        
        onAddTodo(newTodo)
        
        // Reset the form
        setTimeout(resetAndFocus, 500)
      }
    } catch (error) {
      console.error(`❌ Error processing ${field}:`, error)
      setCurrentPrompt(`Something went wrong. Please try again.`)
    } finally {
      setIsProcessing(false)
    }
  }
  
  const incrementUrgency = (amount: number) => {
    setUrgency((prev) => {
      const newValue = +(prev + amount).toFixed(1)
      return Math.min(Math.max(1, newValue), 5)
    })
  }
  
  const handleUrgencySubmit = () => {
    handleFieldSubmit("urgency", urgency.toString())
  }

  const isCollectingDetails = todoTitle && (suggestions.length > 0 || pendingFields.length > 0)

  const validateAndFormatDate = (dateStr?: string): string | undefined => {
    if (!dateStr) return undefined;
    
    try {
      // Try to parse the date
      const date = new Date(dateStr);
      
      // Check if it's a valid date
      if (isNaN(date.getTime())) {
        console.error("Invalid date format:", dateStr);
        return undefined;
      }
      
      // If it's already in ISO format and has time component, return as is
      if (dateStr.includes('T') && dateStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
        return dateStr;
      }
      
      // Otherwise, convert to ISO format
      return date.toISOString();
    } catch (error) {
      console.error("Error parsing date:", error);
      return undefined;
    }
  }

  return (
    <div className="mb-8">
      <div className="relative bg-white dark:bg-[#131316] rounded-[12px] shadow-md dark:shadow-lg overflow-hidden max-w-[600px] mx-auto">
        <BorderBeamMask 
          borderColor="rgba(124, 90, 255, 0.5)"
        />
        <div className="p-5">
          {/* Current prompt - show at top when collecting details */}
          <AnimatePresence>
            {currentPrompt && isCollectingDetails && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-[17px] font-medium text-gray-700 dark:text-gray-200 mb-4"
              >
                {currentPrompt}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main input - hide when collecting details */}
          {!isCollectingDetails && (
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="what's on your agenda?"
                className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-[15px] transition-colors duration-200 text-center"
                disabled={isProcessing || (pendingFields.includes("urgency") && pendingFields.length === 1)}
                // Remove the onFocus handler that was causing issues
              />
              <button
                type="submit"
                className={`p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors ${!inputValue.trim() || isProcessing ? 'opacity-0' : 'opacity-100'}`}
              >
                <ArrowUp className="w-4 h-4 text-gray-400 dark:text-white/50" />
              </button>
              {isProcessing && (
                <div className="w-6 h-6 flex items-center justify-center">
                  <IOSpinner />
                </div>
              )}
            </form>
          )}

          {/* Todo title preview */}
          <AnimatePresence>
            {todoTitle && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={`${isCollectingDetails ? "mb-4" : "mt-2 border-t border-gray-200 dark:border-white/10 pt-2"}`}
              >
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full border border-gray-300 dark:border-white/30 mr-2"></div>
                  <p className="text-[15px] font-medium text-gray-800 dark:text-white/90">{todoTitle}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Suggestions */}
          <AnimatePresence>
            {suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap items-center gap-2 mb-4"
              >
                {suggestions.map((suggestion, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSubmit(undefined, suggestion.value)}
                    className="px-3 py-1.5 rounded-full text-[13px] bg-[#7c5aff]/10 dark:bg-[#7c5aff]/20 text-[#7c5aff] dark:text-[#a490ff] flex items-center gap-1.5 border border-[#7c5aff]/20 dark:border-[#7c5aff]/30 transition-colors hover:bg-[#7c5aff]/20 dark:hover:bg-[#7c5aff]/30"
                  >
                    {suggestion.type === 'date' && <Calendar className="w-3.5 h-3.5" />}
                    {suggestion.type === 'time' && <Clock className="w-3.5 h-3.5" />}
                    {suggestion.display}
                  </motion.button>
                ))}
                <form onSubmit={handleSubmit} className="flex items-center">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Or enter manually..."
                    className="px-3 py-1.5 rounded-full text-[13px] bg-gray-100/50 dark:bg-white/5 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-[#7c5aff]/30 dark:focus:border-[#7c5aff]/40 transition-colors w-[150px]"
                  />
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Secondary input for additional details - moved below suggestions */}
          <AnimatePresence>
            {isCollectingDetails && !pendingFields.includes("urgency") && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-gray-200 dark:border-white/10 pt-4"
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Provide more details..."
                  className="w-full bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-[15px] transition-colors duration-200"
                  disabled={isProcessing}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Urgency Field - Only show when urgency is the only field needed */}
          <AnimatePresence>
            {pendingFields.includes("urgency") && pendingFields.length === 1 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="border-t border-gray-200 dark:border-white/10 pt-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Urgency:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => incrementUrgency(-0.5)}
                      className="w-8 h-8 flex items-center justify-center rounded-[6px] bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                    <input
                      type="text"
                      value={urgency.toFixed(1)}
                      readOnly
                      className="w-12 text-center text-gray-900 dark:text-white text-[15px] bg-transparent border-none outline-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleUrgencySubmit()
                        } else if (e.key === "ArrowLeft") {
                          e.preventDefault()
                          incrementUrgency(-0.5)
                        } else if (e.key === "ArrowRight") {
                          e.preventDefault()
                          incrementUrgency(0.5)
                        }
                      }}
                    />
                    <button
                      onClick={() => incrementUrgency(0.5)}
                      className="w-8 h-8 flex items-center justify-center rounded-[6px] bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                    <button
                      onClick={handleUrgencySubmit}
                      className="ml-2 px-4 h-8 bg-gradient-to-b from-[#7c5aff] to-[#6c47ff] rounded-[6px] shadow-[inset_0px_1px_0px_0px_rgba(255,255,255,0.16),0px_1px_2px_0px_rgba(0,0,0,0.20)] text-white text-[13px] font-medium hover:from-[#8f71ff] hover:to-[#7c5aff] active:from-[#6c47ff] active:to-[#5835ff] transition-all duration-200"
                    >
                      Set Urgency
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
} 