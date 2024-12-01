'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { nanoid } from 'nanoid'
import { generateConversation, generateNonDualConversation } from '@/app/actions/generateConversation';
import { RotateCw, Info } from 'lucide-react';

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

interface RainCircle {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  color: string;
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
  const minDistance = radius * 6 // Increased for even more spacing
  const textHeight = 150 // Increased text height buffer
  return existingCircles.some(circle => {
    const dx = x - circle.x
    const dy = y - circle.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const verticalOverlap = Math.abs(dy) < (radius * 2 + textHeight)
    const horizontalOverlap = Math.abs(dx) < radius * 4
    return distance < minDistance || (verticalOverlap && horizontalOverlap)
  })
}

const InfiniteCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [circles, setCircles] = useState<Circle[]>([])
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isExistentialMode, setIsExistentialMode] = useState(false)
  const [hasTriedBothModes, setHasTriedBothModes] = useState(false)
  const [isDissolving, setIsDissolving] = useState(false)
  const [showVideo, setShowVideo] = useState(false)
  const [circleCount, setCircleCount] = useState(0)
  const [showInfo, setShowInfo] = useState(false)
  const [rainCircles, setRainCircles] = useState<RainCircle[]>([]);

  const renderCircleText = useCallback((ctx: CanvasRenderingContext2D, circle: Circle) => {
    if (!circle.isCurrentlySpeaking) {
      // Only render the name if not speaking
      ctx.font = '14px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillStyle = `rgba(31, 41, 55, ${circle.opacity})`
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
    
    // Clean up the text to only show the current speaker's part
    const text = circle.quote
      .split(/[.!?]/) // Split by sentence endings
      .filter(sentence => 
        sentence.trim().startsWith(circle.author) || // Sentences starting with speaker's name
        (!sentence.includes(':') && !Object.values(circles).some(c => 
          c.author !== circle.author && sentence.includes(c.author)
        )) // Sentences without other speakers' names
      )
      .map(sentence => sentence.replace(`${circle.author}:`, '').trim()) // Remove speaker's name prefix
      .join('. ') // Rejoin with periods
      .trim();

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

    // Draw text directly without background
    ctx.fillStyle = `rgba(31, 41, 55, ${circle.opacity})`
    lines.forEach((line, i) => {
      // Add text shadow for better readability
      ctx.shadowColor = 'white'
      ctx.shadowBlur = 4
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
      
      ctx.fillText(
        line,
        circle.x,
        circle.y + circle.radius + 26 + (i * lineHeight)
      )
    })
    
    // Reset shadow
    ctx.shadowBlur = 0
  }, [circles])

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
      const viewportCenter = {
        x: canvasSize.width/2 - offset.x,
        y: canvasSize.height/2 - offset.y
      }
      
      do {
        x1 = viewportCenter.x + (Math.random() - 0.5) * 400
        y1 = viewportCenter.y + (Math.random() - 0.5) * 400
        attempts++
      } while (
        checkCircleOverlap(x1, y1, 50, circles) && 
        attempts < 50
      )

      // Try different angles for second circle until non-overlapping position found
      let x2: number, y2: number
      let angle = 0
      const distance = 300 // Increased distance between circles
      
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
      
      // Generate conversations based on mode
      const conversationFunction = isExistentialMode ? 
        generateNonDualConversation : 
        generateConversation;

      const [result1, result2] = await Promise.all([
        conversationFunction(author, companionName),
        conversationFunction(companionName, author)
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
        setCircleCount(prev => prev + 2)
        
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
      
      // Save the current context state
      ctx.save()
      
      // Apply the pan offset
      ctx.translate(offset.x, offset.y)

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

      // Draw rain circles
      rainCircles.forEach((circle) => {
        ctx.beginPath();
        
        ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
        ctx.strokeStyle = circle.color + Math.floor(circle.opacity * 255).toString(16).padStart(2, '0');
        ctx.lineWidth = 1;
        ctx.stroke();

        // Optional: Add ripple effect
        for (let i = 1; i <= 2; i++) {
          ctx.beginPath();
          ctx.arc(
            circle.x, 
            circle.y, 
            circle.radius * (1 - i * 0.2), 
            0, 
            Math.PI * 2
          );
          ctx.strokeStyle = circle.color + Math.floor(circle.opacity * 0.5 * 255).toString(16).padStart(2, '0');
          ctx.stroke();
        }
      });

      // Restore the context state
      ctx.restore()
      requestAnimationFrame(animate)
    }

    animate()
  }, [circles, canvasSize, offset, renderCircleText, rainCircles])

  // Add this new function to handle text click
  const generateNextRound = async (circle1: Circle, circle2: Circle) => {
    setIsGenerating(true)
    try {
      const conversationFunction = isExistentialMode ? 
        generateNonDualConversation : 
        generateConversation;

      const [result1, result2] = await Promise.all([
        conversationFunction(circle1.author, circle2.author),
        conversationFunction(circle2.author, circle1.author)
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

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const newOffset = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      }
      setOffset(newOffset)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (isDragging) return // Don't handle clicks while dragging
    
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left - offset.x
    const y = e.clientY - rect.top - offset.y
    
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
  }

  const handleButtonClick = async (isExistential: boolean) => {
    const useFemaleName = Math.random() < 0.5;
    const names = useFemaleName ? femaleNames : maleNames;
    const randomName = names[Math.floor(Math.random() * names.length)];
    setIsExistentialMode(isExistential);
    await addCircle(randomName);
    
    // Track if both modes have been tried
    if (!hasTriedBothModes && circles.length > 0) {
      setHasTriedBothModes(true);
    }
  };

  const handleIAmClick = () => {
    setIsDissolving(true);
    
    // Fade out conversation circles
    setCircles(prev => prev.map(circle => ({
      ...circle,
      opacity: 0,
      isCurrentlySpeaking: false
    })));
    
    // Clear conversation circles after fade
    setTimeout(() => {
      setCircles([]);
      
      // Start rain animation
      const createRainDrop = () => ({
        x: Math.random() * canvasSize.width,
        y: Math.random() * canvasSize.height,
        radius: Math.random() * 20 + 10,
        opacity: Math.random() * 0.5 + 0.5,
        color: ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'][Math.floor(Math.random() * 4)]
      });

      // Add initial rain drops
      setRainCircles(Array(50).fill(null).map(createRainDrop));

      // Add more drops over time
      const rainInterval = setInterval(() => {
        setRainCircles(prev => {
          if (prev.length >= 500) {
            clearInterval(rainInterval);
            return prev;
          }
          return [...prev, ...Array(10).fill(null).map(createRainDrop)];
        });
      }, 100);

      // Start fading out rain drops
      setTimeout(() => {
        const fadeInterval = setInterval(() => {
          setRainCircles(prev => {
            const newCircles = prev.map(circle => ({
              ...circle,
              opacity: circle.opacity * 0.95
            })).filter(circle => circle.opacity > 0.01);

            if (newCircles.length === 0) {
              clearInterval(fadeInterval);
            }
            return newCircles;
          });
        }, 50);

        // Show video after complete fade
        setTimeout(() => {
          setShowVideo(true);
        }, 10000); // 10 second blank canvas
      }, 5000); // Start fading after 5 seconds of full rain
    }, 2000);
  };

  const resetExperience = () => {
    window.location.reload();
  }

  const InfoPopup = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg mx-4">
        <h2 className="text-2xl font-bold mb-4">About This Experience</h2>
        <div className="space-y-4 text-gray-600">
          <p>This is an interactive meditation on consciousness and connection. Each circle represents a being, engaged in conversation with others.</p>
          <p>Start with casual conversations, progress through existential contemplation, and finally arrive at the realization of &ldquo;I AM&rdquo;.</p>
          <p>The journey is yours to explore - you can remove participants, continue conversations, or start fresh at any time.</p>
        </div>
        <button
          onClick={() => setShowInfo(false)}
          className="mt-6 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-r transition-colors duration-1000 
        ${isDissolving 
          ? 'from-blue-800 via-green-900 to-blue-800' 
          : 'from-blue-200 via-white to-blue-200'} 
        animate-gradient-x`}>
      </div>
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
      />
      <div className="absolute bottom-4 left-4 space-y-2 p-4 bg-white bg-opacity-80 rounded-lg shadow-lg">
        <div className="flex gap-2">
          <button
            onClick={() => handleButtonClick(false)}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
            disabled={isGenerating || isDissolving}
          >
            {isGenerating ? 'Thinking...' : 'People appear'}
          </button>
          
          {circleCount >= 4 && (
            <button
              onClick={() => handleButtonClick(true)}
              className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors disabled:opacity-50 animate-fade-in"
              disabled={isGenerating || isDissolving}
            >
              {isGenerating ? 'Thinking...' : 'Existential crisis'}
            </button>
          )}
          
          {hasTriedBothModes && circleCount >= 4 && (
            <button
              onClick={handleIAmClick}
              className="flex-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:opacity-50 animate-fade-in"
              disabled={isGenerating || isDissolving}
            >
              I AM
            </button>
          )}
        </div>

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

      <div className="absolute bottom-4 right-4 flex items-center gap-2">
        <button
          onClick={() => setShowInfo(true)}
          className="flex items-center justify-center w-10 h-10 bg-black bg-opacity-80 text-white rounded-full hover:bg-opacity-70 transition-colors shadow-lg"
          title="About"
        >
          <Info size={20} />
        </button>
        <button
          onClick={resetExperience}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors shadow-lg"
        >
          <span>ALWAYS NOW</span>
          <RotateCw size={16} />
        </button>
      </div>

      {/* Video popup */}
      {showVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white p-4 rounded-lg shadow-xl max-w-3xl w-full mx-4">
            <div className="relative pt-[56.25%]">
              <iframe
                className="absolute top-0 left-0 w-full h-full"
                src="https://www.youtube.com/embed/r8g9eGwFS30?si=df59I5yDbKOaw838&start=256&autoplay=1"
                title="I AM"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            <button
              onClick={resetExperience}
              className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Close & Reset
            </button>
          </div>
        </div>
      )}

      {showInfo && <InfoPopup />}
    </div>
  )
}

export default InfiniteCanvas

