
import type { UserProfile } from '../types';

// This is a mock service. In a real application, this would make API calls to the Facebook Graph API.
export const getProfile = (token: string): Promise<UserProfile> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (token && token.startsWith('EAA')) {
        // Simulate a successful API call
        const mockUser: UserProfile = {
          id: '100001234567890',
          name: 'AI User',
          pictureUrl: `https://picsum.photos/seed/${token.slice(0, 10)}/200/200`,
        };
        resolve(mockUser);
      } else {
        // Simulate an invalid token error
        reject(
          new Error(
            'Mã Access Token không hợp lệ hoặc đã hết hạn. Vui lòng tạo một mã mới.',
          ),
        );
      }
    }, 1000);
  });
};
