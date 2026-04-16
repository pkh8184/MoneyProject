import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import WatchlistButton from '../WatchlistButton'

describe('WatchlistButton', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders empty star initially', () => {
    render(<WatchlistButton code="005930" />)
    expect(screen.getByLabelText('즐겨찾기에 추가')).toBeInTheDocument()
  })

  it('toggles to filled star after click', () => {
    render(<WatchlistButton code="005930" />)
    fireEvent.click(screen.getByLabelText('즐겨찾기에 추가'))
    expect(screen.getByLabelText('즐겨찾기에서 빼기')).toBeInTheDocument()
  })

  it('persists toggle to localStorage', () => {
    render(<WatchlistButton code="005930" />)
    fireEvent.click(screen.getByLabelText('즐겨찾기에 추가'))
    const raw = localStorage.getItem('ws:watchlist:anon')
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!)
    expect(parsed.data.entries).toHaveLength(1)
    expect(parsed.data.entries[0].code).toBe('005930')
  })
})
