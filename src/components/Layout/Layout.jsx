import { Outlet } from 'react-router-dom'
import Sidebar from '../Sidebar/Sidebar'
import Topbar from './Topbar'
import styles from './Layout.module.css'
import { useState } from 'react'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className={styles.root}>
      <Sidebar isOpen={sidebarOpen} />
      <div className={`${styles.main} ${!sidebarOpen ? styles.full : ''}`}>
        <Topbar onMenuClick={() => setSidebarOpen((v) => !v)} />
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
