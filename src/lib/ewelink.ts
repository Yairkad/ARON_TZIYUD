/**
 * eWeLink API Integration
 * Controls SONOFF devices via eWeLink cloud API
 */

interface EWeLinkConfig {
  email: string
  password: string
  region: 'us' | 'eu' | 'cn' | 'as'
}

interface EWeLinkDevice {
  deviceid: string
  name: string
  online: boolean
  params: {
    switch?: 'on' | 'off'
    switches?: Array<{ switch: 'on' | 'off'; outlet: number }>
  }
}

class EWeLinkClient {
  private apiUrl: string
  private token: string | null = null
  private tokenExpiry: number = 0

  constructor(private config: EWeLinkConfig) {
    this.apiUrl = `https://${config.region}-apia.coolkit.cc`
  }

  /**
   * Login to eWeLink API and get access token
   */
  async login(): Promise<boolean> {
    try {
      console.log('🔐 Logging in to eWeLink...')

      const response = await fetch(`${this.apiUrl}/v2/user/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CK-Appid': 'YzfeftUVcZ6twZw1OoVKPRFYTrGEg01Q' // eWeLink official app ID
        },
        body: JSON.stringify({
          email: this.config.email,
          password: this.config.password,
        })
      })

      const data = await response.json()

      if (data.error === 0 && data.data?.at) {
        this.token = data.data.at
        this.tokenExpiry = Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
        console.log('✅ eWeLink login successful')
        return true
      }

      console.error('❌ eWeLink login failed:', data)
      return false
    } catch (error) {
      console.error('❌ eWeLink login error:', error)
      return false
    }
  }

  /**
   * Ensure we have a valid token
   */
  private async ensureToken(): Promise<boolean> {
    if (this.token && Date.now() < this.tokenExpiry) {
      return true
    }
    return await this.login()
  }

  /**
   * Get list of all devices
   */
  async getDevices(): Promise<EWeLinkDevice[]> {
    if (!await this.ensureToken()) {
      throw new Error('Failed to authenticate with eWeLink')
    }

    try {
      const response = await fetch(`${this.apiUrl}/v2/device/thing`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          'X-CK-Appid': 'YzfeftUVcZ6twZw1OoVKPRFYTrGEg01Q'
        }
      })

      const data = await response.json()

      if (data.error === 0 && data.data?.thingList) {
        return data.data.thingList
      }

      console.error('❌ Failed to get devices:', data)
      return []
    } catch (error) {
      console.error('❌ Error getting devices:', error)
      return []
    }
  }

  /**
   * Get device status
   */
  async getDeviceStatus(deviceId: string): Promise<EWeLinkDevice | null> {
    if (!await this.ensureToken()) {
      throw new Error('Failed to authenticate with eWeLink')
    }

    try {
      const response = await fetch(`${this.apiUrl}/v2/device/thing/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          'X-CK-Appid': 'YzfeftUVcZ6twZw1OoVKPRFYTrGEg01Q'
        },
        body: JSON.stringify({
          type: 1,
          id: deviceId
        })
      })

      const data = await response.json()

      if (data.error === 0 && data.data) {
        return data.data
      }

      return null
    } catch (error) {
      console.error('❌ Error getting device status:', error)
      return null
    }
  }

  /**
   * Control device switch
   */
  async setSwitch(deviceId: string, state: 'on' | 'off'): Promise<boolean> {
    if (!await this.ensureToken()) {
      throw new Error('Failed to authenticate with eWeLink')
    }

    try {
      console.log(`📡 Setting device ${deviceId} to ${state}`)

      const response = await fetch(`${this.apiUrl}/v2/device/thing/status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          'X-CK-Appid': 'YzfeftUVcZ6twZw1OoVKPRFYTrGEg01Q'
        },
        body: JSON.stringify({
          type: 1,
          id: deviceId,
          params: {
            switch: state
          }
        })
      })

      const data = await response.json()

      if (data.error === 0) {
        console.log(`✅ Device ${deviceId} switched ${state}`)
        return true
      }

      console.error('❌ Failed to switch device:', data)
      return false
    } catch (error) {
      console.error('❌ Error switching device:', error)
      return false
    }
  }

  /**
   * Unlock cabinet (pulse for 0.5 seconds)
   * This is the main function you'll use to open the solenoid lock
   */
  async unlockCabinet(deviceId: string, pulseDuration: number = 500): Promise<boolean> {
    try {
      console.log(`🔓 Unlocking cabinet ${deviceId} for ${pulseDuration}ms`)

      // Turn on the relay (activate solenoid)
      const onSuccess = await this.setSwitch(deviceId, 'on')
      if (!onSuccess) {
        console.error('❌ Failed to turn on relay')
        return false
      }

      // Wait for the pulse duration
      await new Promise(resolve => setTimeout(resolve, pulseDuration))

      // Turn off the relay (deactivate solenoid)
      const offSuccess = await this.setSwitch(deviceId, 'off')
      if (!offSuccess) {
        console.error('⚠️ Warning: Failed to turn off relay - it may stay on!')
        return false
      }

      console.log('✅ Cabinet unlocked successfully')
      return true

    } catch (error) {
      console.error('❌ Error unlocking cabinet:', error)

      // Safety: try to turn off the relay even if there was an error
      try {
        await this.setSwitch(deviceId, 'off')
      } catch (e) {
        console.error('❌ Critical: Failed to turn off relay after error!')
      }

      return false
    }
  }
}

// Singleton instance
let ewelinkClient: EWeLinkClient | null = null

/**
 * Get eWeLink client instance
 */
export function getEWeLinkClient(): EWeLinkClient {
  if (!ewelinkClient) {
    const config: EWeLinkConfig = {
      email: process.env.EWELINK_EMAIL || '',
      password: process.env.EWELINK_PASSWORD || '',
      region: (process.env.EWELINK_REGION as any) || 'us'
    }

    if (!config.email || !config.password) {
      throw new Error('eWeLink credentials not configured in environment variables')
    }

    ewelinkClient = new EWeLinkClient(config)
  }

  return ewelinkClient
}

export default EWeLinkClient
