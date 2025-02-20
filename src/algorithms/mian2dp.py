from collections import defaultdict
import re
import os
def can_sum_to_target(target, numbers, max_steps=10):
    path_tree = defaultdict(lambda: defaultdict(list))
    path_tree[0] = {}  # 根节点
    current_sums = {0}
    unique_paths = set()  # 新增：用于存储标准化路径

    for step in range(1, max_steps + 1):
        new_sums = set()
        next_tree = defaultdict(lambda: defaultdict(list))
        
        for curr_sum in current_sums:
            for num in numbers:
                new_sum = curr_sum + num
                next_tree[new_sum][curr_sum].append(num)
                new_sums.add(new_sum)

        for sum_val, sources in next_tree.items():
            path_tree[sum_val].update(sources)
        
        current_sums = new_sums

        if target in path_tree:
            def generate_paths(sum_val, max_depth):
                if sum_val == 0:
                    return [[]]
                if max_depth <= 0:
                    return []
                    
                paths = []
                for prev_sum, nums in path_tree[sum_val].items():
                    for num in nums:
                        for path in generate_paths(prev_sum, max_depth-1):
                            # 标准化路径：排序后转为元组
                            standardized = tuple(sorted([num] + path, key=abs))
                            if standardized not in unique_paths:
                                unique_paths.add(standardized)
                                paths.append([num] + path)
                return paths
            
            all_paths = generate_paths(target, step)
            # 二次过滤：排除元素相同但顺序不同的路径
            final_paths = []
            seen = set()
            for p in all_paths:
                key = tuple(sorted(p, key=lambda x: (abs(x), x)))
                if key not in seen:
                    seen.add(key)
                    final_paths.append(p)
            return True, final_paths
    
    return False, []


# 输入目标整数
n = int(input("请输入你想要凑出的整数: "))

print("当前工作目录:", os.getcwd())
print("文件是否存在:", os.path.exists('../../src/DataService.js'))
with open('./src/DataService.js', 'r', encoding='utf-8') as file:
    content = file.read()

# 使用正则表达式匹配 item_value 的值
pattern = r'item_value: (-?\d+)'
matches = re.findall(pattern, content)

# 将匹配到的字符串转换为整数并存储在 numbers 数组中
numbers = [int(match) for match in matches]

# 打印 numbers 数组
print(numbers)
# 定义凑数方法
#numbers = [-80, -150, -168, -186, -204, -232, -210, -199, -188, -177, -166, -155, -144, -122, -81, -322, -282, -202, -177, -84, -83, -79, -69, -64, -61, +252, +500, +120, +72, +108, +180]
#numbers = [-61, -125, -69, -141, -79, -159, -88, -177, -122, -251, -162, -324, -202, -404, -242, -484, -282, -564, -322, -644, -81, -165, -89, -179, -100, -199, -111, -222, -122, -244, -133, -265, -144, -288, -155, -310, -166, -332, -177, -354, -188, -376, -199, -398, -210, -420, -221, -442, -232, -464, -80, -162, -87, -175,+252, +500, +120, +72, +108, +180,+100,+200,+20,+101];
# 尝试凑出目标整数
result, paths = can_sum_to_target(n, numbers, max_steps=10)

# 输出结果
if result:
    print(f"可以凑出{n}，路径为: {paths}")
else:
    print(f"无法凑出{n}")
