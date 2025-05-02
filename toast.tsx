'use client'

import * as React from 'react'
import { Check } from 'lucide-react'
import { IOSpinner } from './spinner'
import { motion, AnimatePresence } from 'framer-motion'

interface ToastProps {
  state: 'initial' | 'loading' | 'success'
  onReset?: () => void
  onSave?: () => void
}

const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" className="text-white">
    <title>circle-info</title>
    <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" stroke="currentColor">
      <circle cx="9" cy="9" r="7.25"></circle>
      <line x1="9" y1="12.819" x2="9" y2="8.25"></line>
      <path d="M9,6.75c-.552,0-1-.449-1-1s.448-1,1-1,1,.449,1,1-.448,1-1,1Z" fill="currentColor" data-stroke="none" stroke="none"></path>
    </g>
  </svg>
)

const springConfig = {
  type: "spring",
  stiffness: 500,
  damping: 30,
  mass: 1
}

export default function Toast({ state = 'initial', onReset, onSave }: ToastProps) {
  const commonClasses = "h-10 bg-[#131316] rounded-[99px] shadow-[0px_32px_64px_-16px_rgba(0,0,0,0.30)] shadow-[0px_16px_32px_-8px_rgba(0,0,0,0.30)] shadow-[0px_8px_16px_-4px_rgba(0,0,0,0.24)] shadow-[0px_4px_8px_-2px_rgba(0,0,0,0.24)] shadow-[0px_-8px_16px_-1px_rgba(0,0,0,0.16)] shadow-[0px_2px_4px_-1px_rgba(0,0,0,0.24)] shadow-[0px_0px_0px_1px_rgba(0,0,0,1.00)] shadow-[inset_0px_0px_0px_1px_rgba(255,255,255,0.08)] shadow-[inset_0px_1px_0px_0px_rgba(255,255,255,0.20)] justify-center items-center inline-flex overflow-hidden"

  return (
    <motion.div
      className={commonClasses}
      initial={false}
      animate={{ width: 'auto' }}
      transition={springConfig}
    >
      <div className="flex items-center justify-between h-full px-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={state}
            className="flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0 }}
          >
            {state === 'loading' && (
              <>
                <IOSpinner />
                <div className="text-white text-[13px] font-normal leading-tight whitespace-nowrap">Saving</div>
              </>
            )}
            {state === 'success' && (
              <>
                <div className="p-0.5 bg-white/25 rounded-[99px] shadow-[0px_2px_4px_-1px_rgba(0,0,0,0.06)] shadow-[0px_1px_2px_-0.5px_rgba(0,0,0,0.06)] shadow-[0px_0px_0px_1px_rgba(0,0,0,0.16)] border border-white/25 justify-center items-center gap-1.5 flex overflow-hidden">
                  <Check className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="text-white text-[13px] font-normal leading-tight whitespace-nowrap">Changes Saved</div>
              </>
            )}
            {state === 'initial' && (
              <>
                <InfoIcon />
                <div className="text-white text-[13px] font-normal leading-tight whitespace-nowrap">Unsaved changes</div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
        <AnimatePresence>
          {state === 'initial' && (
            <motion.div
              className="flex items-center gap-2 ml-2"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ ...springConfig, opacity: { duration: 0 } }}
            >
              <button 
                onClick={onReset}
                className="px-3 rounded-[99px] justify-center items-center flex hover:bg-white/[0.08] transition-colors"
              >
                <div className="text-white text-[13px] font-normal leading-tight">Reset</div>
              </button>
              <div 
                onClick={onSave}
                className="h-7 px-3 bg-gradient-to-b from-[#7c5aff] to-[#6c47ff] rounded-[99px] shadow-[inset_0px_1px_0px_0px_rgba(255,255,255,0.16),0px_1px_2px_0px_rgba(0,0,0,0.20)] justify-center items-center inline-flex overflow-hidden cursor-pointer hover:from-[#8f71ff] hover:to-[#7c5aff] active:from-[#6c47ff] active:to-[#5835ff] transition-all duration-200"
              >
                <div className="text-white text-[13px] font-medium leading-tight">Save</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
