import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, PlayCircle } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';

export default function VideoPlayer() {
  const { id } = useParams();
  // In a real app we'd fetch lesson by ID and get the Cloudflare Stream UID.
  const videoUid = "5d5bc37ffcf54c9b82e996823bffbb81"; // Example UID for Cloudflare stream

  return (
    <div className="max-w-4xl mx-auto py-6">
      <Link to="/" className="inline-flex items-center text-sm font-medium text-rose-400 hover:text-pink-400 mb-6 transition-colors">
         <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
      </Link>
      
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight mb-2 text-rose-50">Understanding Pointers in C++</h1>
        <p className="text-rose-400 flex items-center font-medium">
           <span className="bg-rose-900 text-rose-300 px-2.5 py-1 rounded text-xs font-semibold mr-3">Lesson 4</span>
           Data Structures in C++
        </p>
      </div>

      <div className="rounded-2xl overflow-hidden border border-rose-800 bg-black aspect-video relative shadow-none">
         {/* Cloudflare Stream iFrame integration */}
         {/* Using a mockup iframe if stream url isn't provided, otherwise use standard integration */}
         <iframe
            src={`https://customer-xxx.cloudflarestream.com/${videoUid}/iframe?poster=https%3A%2F%2Fcustomer-xxx.cloudflarestream.com%2F${videoUid}%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D%26height%3D600`}
            style={{border: 'none', position: 'absolute', top: 0, left: 0, height: '100%', width: '100%'}}
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
            allowFullScreen={true}
          ></iframe>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="md:col-span-2">
            <h3 className="text-lg font-bold mb-3 text-rose-200">About this lesson</h3>
            <p className="text-rose-400 leading-relaxed text-sm">
               In this lesson, we will deep dive into memory management and how pointers work under the hood in C++. 
               You will learn how to declare, initialize, and dereference pointers, as well as how they relate to arrays and dynamic memory allocation.
            </p>
         </div>
         <div>
            <Card className="bg-rose-900 border-rose-800 shadow-none rounded-2xl">
               <CardContent className="p-5">
                  <h4 className="font-semibold text-xs uppercase tracking-widest text-rose-400 mb-4">Resources</h4>
                  <ul className="space-y-4">
                     <li>
                        <a href="#" className="flex items-center text-sm font-medium text-rose-300 hover:text-pink-400 transition-colors">
                           <PlayCircle className="h-4 w-4 mr-3 text-pink-500" /> Lesson Slides (PDF)
                        </a>
                     </li>
                     <li>
                        <Link to="/compiler" className="flex items-center text-sm font-medium text-rose-300 hover:text-pink-400 transition-colors">
                           <PlayCircle className="h-4 w-4 mr-3 text-pink-500" /> Practice Workspace
                        </Link>
                     </li>
                  </ul>
               </CardContent>
            </Card>
         </div>
      </div>
    </div>
  );
}
