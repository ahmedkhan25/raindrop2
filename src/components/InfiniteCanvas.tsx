'use client'

import React, { useRef, useEffect, useState } from 'react'
import { nanoid } from 'nanoid'
import { generateConversation } from '@/app/actions/generateConversation';

interface Circle {
  id: string
  x: number
  y: number
  radius: number
  quote: string
  author: string
  color: string
  isCurrentlySpeaking: boolean
  opacity: number
}

const maleNames = [
  'John', 'James', 'Ahmed', 'David', 'Michael', 'Carlos', 'Ali', 'Daniel', 'Luis', 'Omar',
  'Thomas', 'Kevin', 'Brian', 'Paul', 'Mark', 'Jose', 'Juan', 'Pedro', 'Ryan', 'Eric',
  // ... add more until 100
];

const femaleNames = [
  'Sarah', 'Emma', 'Derya', 'Maria', 'Sofia', 'Anna', 'Lisa', 'Nina', 'Mira', 'Lena',
  'Julia', 'Laura', 'Maya', 'Zara', 'Leila', 'Nora', 'Diana', 'Elena', 'Clara', 'Rosa',
  // ... add more until 100
];

const checkCircleOverlap = (
  x: number, 
  y: number, 
  radius: number, 
  existingCircles: Circle[]
): boolean => {
  const minDistance = radius * 4 // Increased for more spacing
  const textHeight = 100 // Approximate max text height
  return existingCircles.some(circle => {
    const dx = x - circle.x
    const dy = y - circle.y
    // Check both circle-to-circle distance and text box overlap
    const distance = Math.sqrt(dx * dx + dy * dy)
    const verticalOverlap = Math.abs(dy) < (radius + textHeight)
    return distance < minDistance || verticalOverlap
  })
}

const InfiniteCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [circles, setCircles] = useState<Circle[]>([])
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth
        canvasRef.current.height = window.innerHeight
        setCanvasSize({ width: window.innerWidth, height: window.innerHeight })
      }
    }
    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
    return () => window.removeEventListener('resize', updateCanvasSize)
  }, [])

  const addCircle = async (author: string) => {
    setIsGenerating(true)
    setError(null)
    const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B']
    
    try {
      let x1: number, y1: number, attempts = 0
      do {
        x1 = Math.random() * (canvasSize.width - 400) + 200
        y1 = Math.random() * (canvasSize.height - 400) + 200
        attempts++
      } while (
        checkCircleOverlap(x1, y1, 50, circles) && 
        attempts < 50
      )

      // Try different angles for second circle until non-overlapping position found
      let x2: number, y2: number
      let angle = 0
      const distance = 200 // Increased distance between circles
      
      do {
        x2 = x1 + Math.cos(angle) * distance
        y2 = y1 + Math.sin(angle) * distance
        angle += Math.PI / 8
      } while (
        checkCircleOverlap(x2, y2, 50, circles) && 
        angle < Math.PI * 2
      )

      // Generate companion name
      const useFemaleName = Math.random() < 0.5
      const names = useFemaleName ? femaleNames : maleNames
      const companionName = names[Math.floor(Math.random() * names.length)]
      
      // Generate conversations for both circles
      const [result1, result2] = await Promise.all([
        generateConversation(author, companionName),
        generateConversation(companionName, author)
      ])

      if (result1.success && result2.success) {
        const newCircles: Circle[] = [
          {
            id: nanoid(),
            x: x1,
            y: y1,
            radius: 50,
            quote: result1.conversation || '',
            author,
            color: colors[Math.floor(Math.random() * colors.length)],
            isCurrentlySpeaking: true,
            opacity: 0
          },
          {
            id: nanoid(),
            x: x2,
            y: y2,
            radius: 50,
            quote: result2.conversation || '',
            author: companionName,
            color: colors[Math.floor(Math.random() * colors.length)],
            isCurrentlySpeaking: false,
            opacity: 0
          }
        ]
        setCircles(prevCircles => [...prevCircles, ...newCircles])
        
        // Start conversation animation
        setTimeout(() => {
          setCircles(prev => prev.map(c => {
            if (c.id === newCircles[0].id) return { ...c, isCurrentlySpeaking: false }
            if (c.id === newCircles[1].id) return { ...c, isCurrentlySpeaking: true }
            return c
          }))
        }, 3000) // Switch speaker after 3 seconds
      } else {
        setError(result1.error || result2.error || 'Failed to generate conversation')
      }
    } catch (error) {
      console.error('Error adding circles:', error)
      setError('An unexpected error occurred')
    } finally {
      setIsGenerating(false)
    }
  }

  const removeCircle = (id: string) => {
    setCircles((prevCircles) => prevCircles.filter((circle) => circle.id !== id))
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      circles.forEach((circle) => {
        // Draw circle first
        ctx.beginPath()
        ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2)
        ctx.strokeStyle = circle.color
        ctx.lineWidth = 2
        ctx.stroke()

        // Draw ripple effects
        const time = Date.now() * 0.001
        for (let i = 1; i <= 3; i++) {
          ctx.beginPath()
          const radiusOffset = Math.sin(time + i) * 5
          ctx.arc(circle.x, circle.y, (circle.radius * (1 - i * 0.2)) + radiusOffset, 0, Math.PI * 2)
          ctx.strokeStyle = `${circle.color}88`
          ctx.stroke()
        }

        // Replace text rendering with new function
        renderCircleText(ctx, circle)
      })

      requestAnimationFrame(animate)
    }

    animate()
  }, [circles, canvasSize])

  const renderCircleText = (ctx: CanvasRenderingContext2D, circle: Circle) => {
    if (!circle.isCurrentlySpeaking) {
      // Only render the name if not speaking
      ctx.font = '14px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
      const nameWidth = ctx.measureText(circle.author).width
      ctx.fillRect(
        circle.x - nameWidth/2 - 10,
        circle.y + circle.radius + 10,
        nameWidth + 20,
        30
      )
      ctx.fillStyle = '#1F2937'
      ctx.fillText(
        circle.author,
        circle.x,
        circle.y + circle.radius + 30
      )
      return
    }

    // Animate opacity for speaking circle
    circle.opacity = Math.min(1, circle.opacity + 0.05)

    const maxWidth = 180
    const lineHeight = 20
    ctx.font = '14px Inter, sans-serif'
    ctx.textAlign = 'center'
    
    // Clean up the text to only show the current speaker's words
    const text = circle.quote.replace(/.*?:/g, '').trim()
    const words = text.split(' ')
    const lines = [circle.author]
    let currentLine = ''

    // Word wrapping
    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const metrics = ctx.measureText(testLine)
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    })
    if (currentLine) {
      lines.push(currentLine)
    }

    const totalHeight = lines.length * lineHeight
    const padding = 10
    
    // Draw background with opacity
    ctx.fillStyle = `rgba(255, 255, 255, ${circle.opacity * 0.9})`
    ctx.fillRect(
      circle.x - maxWidth/2 - padding,
      circle.y + circle.radius + 10,
      maxWidth + padding * 2,
      totalHeight + padding * 2
    )

    // Draw text with opacity
    ctx.fillStyle = `rgba(31, 41, 55, ${circle.opacity})`
    lines.forEach((line, i) => {
      ctx.fillText(
        line,
        circle.x,
        circle.y + circle.radius + 26 + (i * lineHeight)
      )
    })
  }

  // Add this new function to handle text click
  const generateNextRound = async (circle1: Circle, circle2: Circle) => {
    setIsGenerating(true)
    try {
      const [result1, result2] = await Promise.all([
        generateConversation(circle1.author, circle2.author),
        generateConversation(circle2.author, circle1.author)
      ])

      if (result1.success && result2.success) {
        setCircles(prev => prev.map(c => {
          if (c.id === circle1.id) {
            return { ...c, quote: result1.conversation || '', isCurrentlySpeaking: true, opacity: 0 }
          }
          if (c.id === circle2.id) {
            return { ...c, quote: result2.conversation || '', isCurrentlySpeaking: false, opacity: 0 }
          }
          return c
        }))

        // Switch speakers after delay
        setTimeout(() => {
          setCircles(prev => prev.map(c => {
            if (c.id === circle1.id) return { ...c, isCurrentlySpeaking: false }
            if (c.id === circle2.id) return { ...c, isCurrentlySpeaking: true }
            return c
          }))
        }, 3000)
      }
    } catch (error) {
      console.error('Error generating next round:', error)
      setError('Failed to generate next conversation')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-100 via-pink-100 to-purple-100 animate-gradient-x"></div>
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 cursor-pointer"
        onClick={(e) => {
          const rect = canvasRef.current?.getBoundingClientRect()
          if (!rect) return
          const x = e.clientX - rect.left
          const y = e.clientY - rect.top
          
          // Find clicked circle or text
          for (let i = 0; i < circles.length; i++) {
            const circle = circles[i]
            
            // Check if clicked on circle
            const circleDistance = Math.sqrt(
              Math.pow(x - circle.x, 2) + 
              Math.pow(y - circle.y, 2)
            )
            if (circleDistance <= circle.radius) {
              removeCircle(circle.id)
              return
            }
            
            // Check if clicked on text label
            const textY = circle.y + circle.radius + 10
            const textHeight = circle.isCurrentlySpeaking ? 100 : 30 // Approximate heights
            if (y >= textY && y <= textY + textHeight) {
              const textWidth = circle.isCurrentlySpeaking ? 200 : 100 // Approximate widths
              if (x >= circle.x - textWidth/2 && x <= circle.x + textWidth/2) {
                // Find the other circle in the conversation
                const otherCircle = circles.find(c => 
                  c.x !== circle.x && 
                  Math.abs(c.y - circle.y) < 300
                )
                if (otherCircle && !isGenerating) {
                  generateNextRound(circle, otherCircle)
                }
                return
              }
            }
          }
        }}
      />
      <div className="absolute bottom-4 left-4 space-y-2 p-4 bg-white bg-opacity-80 rounded-lg shadow-lg">
        <button
          onClick={async () => {
            const useFemaleName = Math.random() < 0.5;
            const names = useFemaleName ? femaleNames : maleNames;
            const randomName = names[Math.floor(Math.random() * names.length)];
            await addCircle(randomName);
          }}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
          disabled={isGenerating}
        >
          {isGenerating ? 'People appearing...' : 'People appear'}
        </button>
        
        <div className="text-sm text-gray-600 mt-2">
          <p>• Tap circle to remove person</p>
          <p>• Tap text to continue conversation</p>
        </div>

        {error && (
          <div className="text-red-500 text-sm mt-2">
            Error: {error}
          </div>
        )}
      </div>
    </div>
  )
}

export default InfiniteCanvas

